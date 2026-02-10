const { OpCode } = require('../compiler/opcodes')

class VM {
  constructor(instructions) {
    this.instructions = instructions
    this.ip = 0 // instruction pointer
    this.stack = []
    this.builtins = {
      priyoTell: (...args) => {
        console.log(...args)
      },
    }
  }

  run() {
    while (this.ip < this.instructions.length) {
      const instr = this.instructions[this.ip]

      switch (instr.op) {
        case OpCode.PUSH_STRING:
          this.stack.push(instr.operand)
          break

        case OpCode.CALL_BUILTIN: {
          const { name, argc } = instr.operand
          const fn = this.builtins[name]

          if (!fn) {
            throw new Error(`Unknown builtin function: ${name}`)
          }

          const args = this.stack.splice(-argc)
          fn(...args)
          break
        }

        case OpCode.HALT:
          return

        default:
          throw new Error(`Unknown opcode: ${instr.op}`)
      }

      this.ip++
    }
  }
}

module.exports = { VM }
