const { OpCode } = require('./opcodes')
const { TokenType } = require('../lexer/token')

class Compiler {
  constructor() {
    this.instructions = []
    this.loopStack = []
    this.scopeDepth = 0
  }

  compile(program) {
    const entry = program.entry
    if (!entry || entry.type !== 'EntryBlock') {
      throw new Error('Invalid AST: missing entry block')
    }

    for (const stmt of entry.body) {
      this.compileStatement(stmt)
    }

    this.emit(OpCode.HALT)
    return this.instructions
  }

  compileStatement(stmt) {
    switch (stmt.type) {
      case 'VariableDeclaration':
        this.compileVariableDeclaration(stmt)
        return

      case 'AssignmentStatement':
        this.compileAssignmentStatement(stmt)
        return

      case 'IfStatement':
        this.compileIfStatement(stmt)
        return

      case 'WhileStatement':
        this.compileWhileStatement(stmt)
        return

      case 'ForStatement':
        this.compileForStatement(stmt)
        return

      case 'BreakStatement':
        this.compileBreakStatement()
        return

      case 'ContinueStatement':
        this.compileContinueStatement()
        return

      case 'ExpressionStatement':
        this.compileExpression(stmt.expression)
        this.emit(OpCode.POP)
        return

      default:
        throw new Error(`Unknown statement type: ${stmt.type}`)
    }
  }

  compileVariableDeclaration(stmt) {
    this.compileExpression(stmt.initializer)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: stmt.identifier.name,
      kind: stmt.kind,
    })
  }

  compileAssignmentStatement(stmt) {
    this.compileExpression(stmt.value)
    this.emit(OpCode.SET_VARIABLE, stmt.identifier.name)
  }

  compileBlockStatement(block) {
    this.emit(OpCode.ENTER_SCOPE)
    this.scopeDepth++

    for (const stmt of block.statements) {
      this.compileStatement(stmt)
    }

    this.emit(OpCode.EXIT_SCOPE)
    this.scopeDepth--
  }

  compileIfStatement(stmt) {
    const endJumps = []

    for (const branch of stmt.branches) {
      this.compileExpression(branch.condition)
      const jumpIfFalseIndex = this.emit(OpCode.JUMP_IF_FALSE, -1)

      this.compileBlockStatement(branch.body)
      endJumps.push(this.emit(OpCode.JUMP, -1))

      this.patchJump(jumpIfFalseIndex, this.instructions.length)
    }

    if (stmt.alternate) {
      this.compileBlockStatement(stmt.alternate)
    }

    const endAddress = this.instructions.length
    for (const jumpIndex of endJumps) {
      this.patchJump(jumpIndex, endAddress)
    }
  }

  compileWhileStatement(stmt) {
    const loopStart = this.instructions.length
    const loopContext = this.enterLoop({
      continueTarget: loopStart,
      continueTargetScopeDepth: this.scopeDepth,
      loopScopeDepth: this.scopeDepth,
    })

    this.compileExpression(stmt.condition)
    const exitJump = this.emit(OpCode.JUMP_IF_FALSE, -1)

    this.compileBlockStatement(stmt.body)
    this.emit(OpCode.JUMP, loopStart)

    const endAddress = this.instructions.length
    this.patchJump(exitJump, endAddress)
    this.patchLoopBreaks(loopContext, endAddress, loopContext.loopScopeDepth)
    this.leaveLoop()
  }

  compileForStatement(stmt) {
    if (stmt.initializer) {
      this.compileStatement(stmt.initializer)
    }

    const loopStart = this.instructions.length
    const loopContext = this.enterLoop({
      continueTarget: null,
      continueTargetScopeDepth: null,
      loopScopeDepth: this.scopeDepth,
    })
    let exitJump = null

    if (stmt.condition) {
      this.compileExpression(stmt.condition)
      exitJump = this.emit(OpCode.JUMP_IF_FALSE, -1)
    }

    this.compileBlockStatement(stmt.body)

    const updateStart = this.instructions.length
    const continueTarget = stmt.update ? updateStart : loopStart
    this.patchLoopContinues(loopContext, continueTarget, this.scopeDepth)

    if (stmt.update) {
      this.compileStatement(stmt.update)
    }

    this.emit(OpCode.JUMP, loopStart)

    const endAddress = this.instructions.length
    if (exitJump != null) {
      this.patchJump(exitJump, endAddress)
    }
    this.patchLoopBreaks(loopContext, endAddress, loopContext.loopScopeDepth)
    this.leaveLoop()
  }

  compileBreakStatement() {
    const loopContext = this.currentLoop()
    if (!loopContext) {
      throw new Error('prakritiStop used outside loop')
    }

    const jumpIndex = this.emit(OpCode.JUMP, -1)
    loopContext.breakJumps.push({ jumpIndex, scopeDepthAtEmit: this.scopeDepth })
  }

  compileContinueStatement() {
    const loopContext = this.currentLoop()
    if (!loopContext) {
      throw new Error('prakritiGoOn used outside loop')
    }

    if (loopContext.continueTarget != null) {
      this.emitScopedJump(loopContext.continueTarget, loopContext.continueTargetScopeDepth)
      return
    }

    const jumpIndex = this.emit(OpCode.JUMP, -1)
    loopContext.continueJumps.push({ jumpIndex, scopeDepthAtEmit: this.scopeDepth })
  }

  compileExpression(expr) {
    switch (expr.type) {
      case 'StringLiteral':
        this.emit(OpCode.PUSH_STRING, expr.value)
        break

      case 'NumberLiteral':
        this.emit(OpCode.PUSH_NUMBER, expr.value)
        break

      case 'BooleanLiteral':
        this.emit(OpCode.PUSH_BOOLEAN, expr.value)
        break

      case 'NullLiteral':
        this.emit(OpCode.PUSH_NULL)
        break

      case 'Identifier':
        this.emit(OpCode.LOAD_VARIABLE, expr.name)
        break

      case 'CallExpression':
        this.compileCallExpression(expr)
        break

      case 'BinaryExpression':
        this.compileBinaryExpression(expr)
        break

      case 'UnaryExpression':
        this.compileUnaryExpression(expr)
        break

      default:
        throw new Error(`Unknown expression type: ${expr.type}`)
    }
  }

  compileCallExpression(expr) {
    for (const arg of expr.arguments) {
      this.compileExpression(arg)
    }

    this.emit(OpCode.CALL_BUILTIN, {
      name: expr.callee.name,
      argc: expr.arguments.length,
    })
  }

  compileBinaryExpression(expr) {
    this.compileExpression(expr.left)
    this.compileExpression(expr.right)

    const opcodeByOperator = {
      [TokenType.PLUS]: OpCode.ADD,
      [TokenType.MINUS]: OpCode.SUB,
      [TokenType.STAR]: OpCode.MUL,
      [TokenType.SLASH]: OpCode.DIV,
      [TokenType.PERCENT]: OpCode.MOD,
      [TokenType.EQ]: OpCode.EQ,
      [TokenType.NOT_EQ]: OpCode.NOT_EQ,
      [TokenType.LT]: OpCode.LT,
      [TokenType.LTE]: OpCode.LTE,
      [TokenType.GT]: OpCode.GT,
      [TokenType.GTE]: OpCode.GTE,
      [TokenType.AND]: OpCode.AND,
      [TokenType.OR]: OpCode.OR,
    }

    const opcode = opcodeByOperator[expr.operator]
    if (opcode == null) {
      throw new Error(`Unsupported binary operator: ${expr.operator}`)
    }

    this.emit(opcode)
  }

  compileUnaryExpression(expr) {
    this.compileExpression(expr.argument)

    const opcodeByOperator = {
      [TokenType.BANG]: OpCode.NOT,
    }

    const opcode = opcodeByOperator[expr.operator]
    if (opcode == null) {
      throw new Error(`Unsupported unary operator: ${expr.operator}`)
    }

    this.emit(opcode)
  }

  emit(op, operand = null) {
    this.instructions.push({ op, operand })
    return this.instructions.length - 1
  }

  patchJump(index, target) {
    this.instructions[index].operand = target
  }

  enterLoop({ continueTarget, continueTargetScopeDepth, loopScopeDepth }) {
    const loopContext = {
      breakJumps: [],
      continueJumps: [],
      continueTarget,
      continueTargetScopeDepth,
      loopScopeDepth,
    }
    this.loopStack.push(loopContext)
    return loopContext
  }

  leaveLoop() {
    this.loopStack.pop()
  }

  currentLoop() {
    return this.loopStack[this.loopStack.length - 1] || null
  }

  patchLoopBreaks(loopContext, target, targetScopeDepth) {
    for (const { jumpIndex, scopeDepthAtEmit } of loopContext.breakJumps) {
      this.patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth)
    }
  }

  patchLoopContinues(loopContext, target, targetScopeDepth) {
    loopContext.continueTarget = target
    loopContext.continueTargetScopeDepth = targetScopeDepth
    for (const { jumpIndex, scopeDepthAtEmit } of loopContext.continueJumps) {
      this.patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth)
    }
  }

  emitScopedJump(target, targetScopeDepth) {
    const unwind = this.scopeDepth - targetScopeDepth
    if (unwind < 0) {
      throw new Error('Invalid scope unwind during jump compilation')
    }

    this.emit(OpCode.JUMP, { target, unwind })
  }

  patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth) {
    const unwind = scopeDepthAtEmit - targetScopeDepth
    if (unwind < 0) {
      throw new Error('Invalid patched scope unwind during jump compilation')
    }

    this.instructions[jumpIndex].operand = { target, unwind }
  }
}

module.exports = { Compiler }
