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
    if (stmt.type !== 'ExpressionStatement') {
      throw new Error(`Unknown statement type: ${stmt.type}`)
    }
  }

  emit(op, operand = null) {
    this.instructions.push({ op, operand })
  }
}

module.exports = { Compiler }
