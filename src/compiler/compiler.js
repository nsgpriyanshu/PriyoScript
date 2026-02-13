const { OpCode } = require('./opcodes')
const { error } = require('../utils/logger')

class Compiler {
  constructor() {
    this.instructions = []
  }

  compile(program) {
    const entry = program.entry
    if (!entry || entry.type !== 'EntryBlock') {
      throw new error('Invalid AST: missing entry block')
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

      case 'ExpressionStatement':
        this.compileExpression(stmt.expression)
        this.emit(OpCode.POP)
        return

      default:
        throw new error(`Unknown statement type: ${stmt.type}`)
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

      default:
        throw new error(`Unknown expression type: ${expr.type}`)
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

  emit(op, operand = null) {
    this.instructions.push({ op, operand })
  }
}

module.exports = { Compiler }
