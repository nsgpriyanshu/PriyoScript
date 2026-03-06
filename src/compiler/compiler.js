const { OpCode } = require('./opcodes')
const { TokenType } = require('../lexer/token')

class Compiler {
  constructor() {
    this.instructions = []
    this.loopStack = []
    this.breakStack = []
    this.scopeDepth = 0
    this.tempCounter = 0
    this.interfaceTable = new Map()
  }

  compile(program) {
    const root = program.root || program.entry
    if (!root || (root.type !== 'EntryBlock' && root.type !== 'PackageBlock')) {
      throw new Error('Invalid AST: missing root block')
    }

    this.collectInterfaces(root.body)

    for (const stmt of root.body) {
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

      case 'ForEachStatement':
        this.compileForEachStatement(stmt)
        return

      case 'SwitchStatement':
        this.compileSwitchStatement(stmt)
        return

      case 'BreakStatement':
        this.compileBreakStatement()
        return

      case 'ContinueStatement':
        this.compileContinueStatement()
        return

      case 'FunctionDeclaration':
        this.compileFunctionDeclaration(stmt)
        return

      case 'ImportStatement':
        this.compileImportStatement(stmt)
        return

      case 'ExportStatement':
        this.compileExportStatement(stmt)
        return

      case 'TryStatement':
        this.compileTryStatement(stmt)
        return

      case 'ThrowStatement':
        this.compileThrowStatement(stmt)
        return

      case 'ClassDeclaration':
        this.compileClassDeclaration(stmt)
        return

      case 'InterfaceDeclaration':
        // Interfaces are compile-time contracts only; they do not emit runtime bytecode.
        return

      case 'ReturnStatement':
        this.compileReturnStatement(stmt)
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
    if (stmt.identifier.type !== 'Identifier') {
      this.compileDestructuringDeclaration(stmt)
      return
    }

    this.compileExpression(stmt.initializer)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: stmt.identifier.name,
      kind: stmt.kind,
    })
  }

  compileDestructuringDeclaration(stmt) {
    this.compileExpression(stmt.initializer)
    this.emit(OpCode.DESTRUCTURE_DEFINE, {
      kind: stmt.kind,
      pattern: this.serializeBindingPattern(stmt.identifier),
    })
  }

  compileAssignmentStatement(stmt) {
    if (stmt.identifier.type === 'Identifier') {
      this.compileExpression(stmt.value)
      this.emit(OpCode.SET_VARIABLE, stmt.identifier.name)
      return
    }

    if (stmt.identifier.type === 'MemberExpression') {
      this.compileExpression(stmt.identifier.object)
      this.compileExpression(stmt.value)
      this.emit(OpCode.SET_PROPERTY, stmt.identifier.property.name)
      return
    }

    if (stmt.identifier.type === 'IndexExpression') {
      this.compileExpression(stmt.identifier.object)
      this.compileExpression(stmt.identifier.index)
      this.compileExpression(stmt.value)
      this.emit(OpCode.SET_INDEX)
      return
    }

    throw new Error(`Invalid assignment target: ${stmt.identifier.type}`)
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

  compileForEachStatement(stmt) {
    const arrayTempName = this.nextTempName('__forEachArray')
    const indexTempName = this.nextTempName('__forEachIndex')

    // Resolve iterable once before loop so expression side-effects run only once.
    this.compileExpression(stmt.iterable)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: arrayTempName,
      kind: 'const',
    })

    this.emit(OpCode.PUSH_NUMBER, 0)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: indexTempName,
      kind: 'let',
    })

    const loopStart = this.instructions.length
    const loopContext = this.enterLoop({
      continueTarget: null,
      continueTargetScopeDepth: null,
      loopScopeDepth: this.scopeDepth,
    })

    // index < iterable.length
    this.emit(OpCode.LOAD_VARIABLE, indexTempName)
    this.emit(OpCode.LOAD_VARIABLE, arrayTempName)
    this.emit(OpCode.GET_PROPERTY, 'length')
    this.emit(OpCode.LT)
    const exitJump = this.emit(OpCode.JUMP_IF_FALSE, -1)

    // Per-iteration scope: expose loop item as const binding.
    this.emit(OpCode.ENTER_SCOPE)
    this.scopeDepth++
    this.emit(OpCode.LOAD_VARIABLE, arrayTempName)
    this.emit(OpCode.LOAD_VARIABLE, indexTempName)
    this.emit(OpCode.GET_INDEX)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: stmt.item.name,
      kind: 'const',
    })

    for (const bodyStatement of stmt.body.statements) {
      this.compileStatement(bodyStatement)
    }

    this.emit(OpCode.EXIT_SCOPE)
    this.scopeDepth--

    const updateStart = this.instructions.length
    this.patchLoopContinues(loopContext, updateStart, this.scopeDepth)

    // index = index + 1
    this.emit(OpCode.LOAD_VARIABLE, indexTempName)
    this.emit(OpCode.PUSH_NUMBER, 1)
    this.emit(OpCode.ADD)
    this.emit(OpCode.SET_VARIABLE, indexTempName)
    this.emit(OpCode.JUMP, loopStart)

    const endAddress = this.instructions.length
    this.patchJump(exitJump, endAddress)
    this.patchLoopBreaks(loopContext, endAddress, loopContext.loopScopeDepth)
    this.leaveLoop()
  }

  compileSwitchStatement(stmt) {
    const enclosingScopeDepth = this.scopeDepth
    this.emit(OpCode.ENTER_SCOPE)
    this.scopeDepth++

    const switchTempName = this.nextTempName('__switchValue')
    this.compileExpression(stmt.discriminant)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: switchTempName,
      kind: 'const',
    })

    const switchContext = this.enterSwitch({
      breakTargetScopeDepth: enclosingScopeDepth,
    })

    const endJumps = []
    let pendingCaseFalseJump = null

    for (const switchCase of stmt.cases) {
      const caseCheckStart = this.instructions.length
      if (pendingCaseFalseJump != null) {
        this.patchJump(pendingCaseFalseJump, caseCheckStart)
      }

      this.emit(OpCode.LOAD_VARIABLE, switchTempName)
      this.compileExpression(switchCase.test)
      this.emit(OpCode.EQ)
      const jumpIfFalse = this.emit(OpCode.JUMP_IF_FALSE, -1)
      pendingCaseFalseJump = jumpIfFalse

      this.compileBlockStatement(switchCase.consequent)
      endJumps.push(this.emit(OpCode.JUMP, -1))
    }

    const defaultStart = this.instructions.length
    if (pendingCaseFalseJump != null) {
      this.patchJump(pendingCaseFalseJump, defaultStart)
    }

    if (stmt.defaultCase) {
      this.compileBlockStatement(stmt.defaultCase)
    }

    this.emit(OpCode.EXIT_SCOPE)
    this.scopeDepth--

    const endAddress = this.instructions.length
    for (const jump of endJumps) {
      this.patchJump(jump, endAddress)
    }
    this.patchSwitchBreaks(switchContext, endAddress, enclosingScopeDepth)
    this.leaveSwitch()
  }

  compileBreakStatement() {
    const breakContext = this.currentBreakContext()
    if (!breakContext) {
      throw new Error('prakritiStop used outside loop/switch')
    }
    const jumpIndex = this.emit(OpCode.JUMP, -1)
    breakContext.breakJumps.push({ jumpIndex, scopeDepthAtEmit: this.scopeDepth })
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

  compileFunctionDeclaration(stmt) {
    this.emit(OpCode.DEFINE_FUNCTION, {
      name: stmt.name.name,
      isAsync: !!stmt.isAsync,
      params: stmt.params.map(param => param.name),
      instructions: this.compileCallableBody(stmt.body),
    })
  }

  compileImportStatement(stmt) {
    if (stmt.sourceType === 'string') {
      this.emit(OpCode.IMPORT_MODULE, {
        source: stmt.source,
      })

      if (stmt.namedImports && stmt.namedImports.length > 0) {
        const moduleTempName = this.nextTempName('__importModule')
        this.emit(OpCode.DEFINE_VARIABLE, {
          name: moduleTempName,
          kind: 'const',
        })

        for (const specifier of stmt.namedImports) {
          this.emit(OpCode.LOAD_VARIABLE, moduleTempName)
          this.emit(OpCode.GET_PROPERTY, specifier.imported)
          this.emit(OpCode.DEFINE_VARIABLE, {
            name: specifier.local,
            kind: 'const',
          })
        }
      } else {
        this.emit(OpCode.DEFINE_VARIABLE, {
          name: stmt.localName,
          kind: 'const',
        })
      }
      return
    }

    // lisaaBring math
    // -> const math = priyoPackage.use("math")
    this.emit(OpCode.LOAD_VARIABLE, 'priyoPackage')
    this.emit(OpCode.PUSH_STRING, stmt.source)
    this.emit(OpCode.CALL_METHOD, {
      name: 'use',
      argc: 1,
    })
    if (stmt.namedImports && stmt.namedImports.length > 0) {
      const packageTempName = this.nextTempName('__importPackage')
      this.emit(OpCode.DEFINE_VARIABLE, {
        name: packageTempName,
        kind: 'const',
      })
      for (const specifier of stmt.namedImports) {
        this.emit(OpCode.LOAD_VARIABLE, packageTempName)
        this.emit(OpCode.GET_PROPERTY, specifier.imported)
        this.emit(OpCode.DEFINE_VARIABLE, {
          name: specifier.local,
          kind: 'const',
        })
      }
    } else {
      this.emit(OpCode.DEFINE_VARIABLE, {
        name: stmt.localName,
        kind: 'const',
      })
    }
  }

  compileExportStatement(stmt) {
    this.emit(OpCode.LOAD_VARIABLE, stmt.identifier.name)
    this.emit(OpCode.EXPORT_NAME, stmt.identifier.name)
  }

  compileTryStatement(stmt) {
    const tryHandlerIndex = this.emit(OpCode.PUSH_TRY, {
      catchTarget: null,
      finallyTarget: null,
      scopeDepth: this.scopeDepth,
    })

    this.compileBlockStatement(stmt.block)

    let jumpAfterTry = null
    let jumpAfterCatch = null
    if (stmt.handler || stmt.finalizer) {
      jumpAfterTry = this.emit(OpCode.JUMP, -1)
    }

    let catchStart = null
    if (stmt.handler) {
      catchStart = this.instructions.length
      this.emit(OpCode.ENTER_SCOPE)
      this.scopeDepth++
      this.emit(OpCode.BEGIN_CATCH, stmt.handler.param ? stmt.handler.param.name : null)
      for (const catchStatement of stmt.handler.body.statements) {
        this.compileStatement(catchStatement)
      }
      this.emit(OpCode.EXIT_SCOPE)
      this.scopeDepth--

      if (stmt.finalizer) {
        jumpAfterCatch = this.emit(OpCode.JUMP, -1)
      }
    }

    let finallyStart = null
    if (stmt.finalizer) {
      finallyStart = this.instructions.length
      this.emit(OpCode.BEGIN_FINALLY)
      this.compileBlockStatement(stmt.finalizer)
    }

    const endTryStart = this.instructions.length
    this.emit(OpCode.END_TRY)
    const endAddress = this.instructions.length

    const tryHandler = this.instructions[tryHandlerIndex].operand
    tryHandler.catchTarget = catchStart
    tryHandler.finallyTarget = finallyStart

    if (jumpAfterTry != null) {
      this.patchJump(jumpAfterTry, stmt.finalizer ? finallyStart : endTryStart)
    }
    if (jumpAfterCatch != null) {
      this.patchJump(jumpAfterCatch, finallyStart)
    }

    // Ensure switch-style contexts can jump here cleanly.
    if (endAddress == null) {
      throw new Error('Failed to compile try/catch/finally end label')
    }
  }

  compileThrowStatement(stmt) {
    this.compileExpression(stmt.argument)
    this.emit(OpCode.THROW)
  }

  compileClassDeclaration(stmt) {
    this.assertConstructorSuperRules(stmt)
    this.assertImplementsRules(stmt)

    const instanceMethods = stmt.methods
      .filter(method => !method.isStatic)
      .map(method => ({
        name: method.name.name,
        isAsync: !!method.isAsync,
        access: method.access || 'public',
        params: method.params.map(param => param.name),
        instructions: this.compileCallableBody(method.body),
      }))

    const staticMethods = stmt.methods
      .filter(method => method.isStatic)
      .map(method => ({
        name: method.name.name,
        isAsync: !!method.isAsync,
        access: method.access || 'public',
        params: method.params.map(param => param.name),
        instructions: this.compileCallableBody(method.body),
      }))

    const instanceFields = (stmt.fields || [])
      .filter(field => !field.isStatic)
      .map(field => ({
        name: field.name.name,
        kind: field.kind,
        access: field.access || 'public',
        instructions: this.compileInitializerThunk(field.initializer),
      }))

    const staticFields = (stmt.fields || [])
      .filter(field => field.isStatic)
      .map(field => ({
        name: field.name.name,
        kind: field.kind,
        access: field.access || 'public',
        instructions: this.compileInitializerThunk(field.initializer),
      }))

    this.emit(OpCode.DEFINE_CLASS, {
      name: stmt.name.name,
      superClassName: stmt.superClass ? stmt.superClass.name : null,
      methods: instanceMethods,
      staticMethods,
      instanceFields,
      staticFields,
    })
  }

  compileCallableBody(bodyBlock) {
    const callableCompiler = new Compiler()
    callableCompiler.compileBlockStatement(bodyBlock)
    callableCompiler.emit(OpCode.PUSH_NULL)
    callableCompiler.emit(OpCode.RETURN)
    return callableCompiler.instructions
  }

  compileInitializerThunk(initializerExpression) {
    const initializerCompiler = new Compiler()
    initializerCompiler.compileExpression(initializerExpression)
    initializerCompiler.emit(OpCode.RETURN)
    return initializerCompiler.instructions
  }

  compileReturnStatement(stmt) {
    if (stmt.argument) {
      this.compileExpression(stmt.argument)
    } else {
      this.emit(OpCode.PUSH_NULL)
    }
    this.emit(OpCode.RETURN)
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

      case 'ArrayLiteral':
        // Stack layout before BUILD_ARRAY: [..., el1, el2, ..., elN]
        // BUILD_ARRAY(N) packs the last N stack values into one JS array.
        for (const element of expr.elements) {
          this.compileExpression(element)
        }
        this.emit(OpCode.BUILD_ARRAY, expr.elements.length)
        break

      case 'Identifier':
        this.emit(OpCode.LOAD_VARIABLE, expr.name)
        break

      case 'ThisExpression':
        this.emit(OpCode.LOAD_VARIABLE, 'priyoSelf')
        break

      case 'SuperExpression':
        this.emit(OpCode.LOAD_VARIABLE, '__priyoSuperMarker')
        break

      case 'MemberExpression':
        this.compileExpression(expr.object)
        this.emit(OpCode.GET_PROPERTY, expr.property.name)
        break

      case 'IndexExpression':
        // Evaluate target and index, then delegate bounds/type checks to VM.
        this.compileExpression(expr.object)
        this.compileExpression(expr.index)
        this.emit(OpCode.GET_INDEX)
        break

      case 'SliceExpression':
        this.compileExpression(expr.object)
        if (expr.start) {
          this.compileExpression(expr.start)
        } else {
          this.emit(OpCode.PUSH_NULL)
        }
        if (expr.end) {
          this.compileExpression(expr.end)
        } else {
          this.emit(OpCode.PUSH_NULL)
        }
        this.emit(OpCode.SLICE_ARRAY)
        break

      case 'CallExpression':
        this.compileCallExpression(expr)
        break

      case 'NewExpression':
        this.compileNewExpression(expr)
        break

      case 'BinaryExpression':
        this.compileBinaryExpression(expr)
        break

      case 'UnaryExpression':
        this.compileUnaryExpression(expr)
        break

      case 'AwaitExpression':
        this.compileExpression(expr.argument)
        this.emit(OpCode.AWAIT_VALUE)
        break

      default:
        throw new Error(`Unknown expression type: ${expr.type}`)
    }
  }

  compileCallExpression(expr) {
    if (expr.callee.type === 'Identifier') {
      for (const arg of expr.arguments) {
        this.compileExpression(arg)
      }
      this.emit(OpCode.CALL_NAMED, {
        name: expr.callee.name,
        argc: expr.arguments.length,
      })
      return
    }

    if (expr.callee.type === 'SuperExpression') {
      for (const arg of expr.arguments) {
        this.compileExpression(arg)
      }
      this.emit(OpCode.CALL_SUPER_METHOD, {
        name: 'init',
        argc: expr.arguments.length,
      })
      return
    }

    if (expr.callee.type === 'MemberExpression') {
      if (expr.callee.object.type === 'SuperExpression') {
        for (const arg of expr.arguments) {
          this.compileExpression(arg)
        }
        this.emit(OpCode.CALL_SUPER_METHOD, {
          name: expr.callee.property.name,
          argc: expr.arguments.length,
        })
        return
      }

      this.compileExpression(expr.callee.object)
      for (const arg of expr.arguments) {
        this.compileExpression(arg)
      }
      this.emit(OpCode.CALL_METHOD, {
        name: expr.callee.property.name,
        argc: expr.arguments.length,
      })
      return
    }

    throw new Error(`Unsupported call target: ${expr.callee.type}`)
  }

  compileNewExpression(expr) {
    if (expr.callee.type !== 'Identifier') {
      throw new Error('Class constructor must be an identifier')
    }

    for (const arg of expr.arguments) {
      this.compileExpression(arg)
    }

    this.emit(OpCode.CREATE_INSTANCE, {
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
      kind: 'loop',
      breakJumps: [],
      continueJumps: [],
      continueTarget,
      continueTargetScopeDepth,
      loopScopeDepth,
    }
    this.loopStack.push(loopContext)
    this.breakStack.push(loopContext)
    return loopContext
  }

  leaveLoop() {
    this.loopStack.pop()
    this.breakStack.pop()
  }

  currentLoop() {
    return this.loopStack[this.loopStack.length - 1] || null
  }

  enterSwitch({ breakTargetScopeDepth }) {
    const switchContext = {
      kind: 'switch',
      breakJumps: [],
      breakTargetScopeDepth,
    }
    this.breakStack.push(switchContext)
    return switchContext
  }

  leaveSwitch() {
    this.breakStack.pop()
  }

  currentBreakContext() {
    return this.breakStack[this.breakStack.length - 1] || null
  }

  patchLoopBreaks(loopContext, target, targetScopeDepth) {
    for (const { jumpIndex, scopeDepthAtEmit } of loopContext.breakJumps) {
      this.patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth)
    }
  }

  patchSwitchBreaks(switchContext, target, targetScopeDepth) {
    for (const { jumpIndex, scopeDepthAtEmit } of switchContext.breakJumps) {
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

  nextTempName(prefix) {
    this.tempCounter++
    return `${prefix}_${this.tempCounter}`
  }

  collectInterfaces(statements) {
    this.interfaceTable.clear()
    for (const statement of statements) {
      if (statement.type !== 'InterfaceDeclaration') continue
      this.interfaceTable.set(statement.name.name, statement)
    }
  }

  serializeBindingPattern(pattern) {
    if (!pattern) return null

    if (pattern.type === 'Identifier') {
      return {
        type: 'Identifier',
        name: pattern.name,
      }
    }

    if (pattern.type === 'ArrayPattern') {
      return {
        type: 'ArrayPattern',
        elements: pattern.elements.map(element => this.serializeBindingPattern(element)),
      }
    }

    if (pattern.type === 'ObjectPattern') {
      return {
        type: 'ObjectPattern',
        properties: pattern.properties.map(property => ({
          key: property.key,
          value: this.serializeBindingPattern(property.value),
        })),
      }
    }

    if (pattern.type === 'DefaultPattern') {
      return {
        type: 'DefaultPattern',
        target: this.serializeBindingPattern(pattern.target),
        defaultInstructions: this.compileInitializerThunk(pattern.defaultValue),
      }
    }

    throw new Error(`Unsupported binding pattern type: ${pattern.type}`)
  }

  assertConstructorSuperRules(classDeclaration) {
    if (!classDeclaration.superClass) return

    const initMethod = classDeclaration.methods.find(
      method => !method.isStatic && method.name.name === 'init',
    )
    if (!initMethod) return

    const firstStatement = initMethod.body.statements[0]
    const isParentConstructorCall =
      firstStatement &&
      firstStatement.type === 'ExpressionStatement' &&
      firstStatement.expression &&
      firstStatement.expression.type === 'CallExpression' &&
      firstStatement.expression.callee &&
      firstStatement.expression.callee.type === 'SuperExpression'

    if (!isParentConstructorCall) {
      throw new Error(
        `Class "${classDeclaration.name.name}" must call priyoParent(...) as first statement in init`,
      )
    }

    // Child init must delegate to parent exactly once.
    let parentConstructorCallCount = 0
    for (const statement of initMethod.body.statements) {
      if (
        statement.type === 'ExpressionStatement' &&
        statement.expression &&
        statement.expression.type === 'CallExpression' &&
        statement.expression.callee &&
        statement.expression.callee.type === 'SuperExpression'
      ) {
        parentConstructorCallCount++
      }
    }

    if (parentConstructorCallCount > 1) {
      throw new Error(
        `Class "${classDeclaration.name.name}" cannot call priyoParent(...) more than once in init`,
      )
    }
  }

  assertImplementsRules(classDeclaration) {
    const implementedInterfaces = classDeclaration.implementedInterfaces || []
    if (implementedInterfaces.length === 0) return

    for (const ifaceRef of implementedInterfaces) {
      const iface = this.interfaceTable.get(ifaceRef.name)
      if (!iface) {
        throw new Error(`Class "${classDeclaration.name.name}" implements unknown interface "${ifaceRef.name}"`)
      }

      for (const ifaceMethod of iface.methods || []) {
        const classMethod = classDeclaration.methods.find(
          method => !method.isStatic && method.name.name === ifaceMethod.name.name,
        )
        if (!classMethod) {
          throw new Error(
            `Class "${classDeclaration.name.name}" must implement method "${ifaceMethod.name.name}" from interface "${iface.name.name}"`,
          )
        }
        if ((classMethod.access || 'public') !== 'public') {
          throw new Error(
            `Method "${classDeclaration.name.name}.${ifaceMethod.name.name}" must be lisaaOpen to satisfy interface "${iface.name.name}"`,
          )
        }
        if (classMethod.params.length !== ifaceMethod.params.length) {
          throw new Error(
            `Method "${classDeclaration.name.name}.${ifaceMethod.name.name}" must accept ${ifaceMethod.params.length} params to satisfy interface "${iface.name.name}"`,
          )
        }
      }
    }
  }
}

module.exports = { Compiler }
