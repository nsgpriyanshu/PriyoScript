const { OpCode } = require('./opcodes')

class Compiler {
  constructor() {
    this.instructions = []
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
    if (stmt.type === 'ExpressionStatement') {
      this.compileExpression(stmt.expression)
      return
    }

    throw new Error(`Unknown statement type: ${stmt.type}`)
  }

  // 🔥 THIS WAS MISSING
  compileExpression(expr) {
    switch (expr.type) {
      case 'StringLiteral':
        this.emit(OpCode.PUSH_STRING, expr.value)
        break

      case 'CallExpression':
        this.compileCallExpression(expr)
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
      name: expr.callee,
      argc: expr.arguments.length,
    })
  }

  emit(op, operand = null) {
    this.instructions.push({ op, operand })
  }
}

module.exports = { Compiler }
