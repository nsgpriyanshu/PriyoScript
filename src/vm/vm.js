const { OpCode } = require('../compiler/opcodes')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')

class VM {
  constructor(instructions, options = {}) {
    this.instructions = instructions
    this.ip = 0
    this.stack = []
    this.environment = options.environment || new Environment()
    this.builtins = options.builtins || createBuiltins(options.io)
  }

  async run() {
    while (this.ip < this.instructions.length) {
      const instr = this.instructions[this.ip]

      switch (instr.op) {
        case OpCode.PUSH_STRING:
        case OpCode.PUSH_NUMBER:
        case OpCode.PUSH_BOOLEAN:
          this.stack.push(instr.operand)
          break

        case OpCode.PUSH_NULL:
          this.stack.push(null)
          break

        case OpCode.DEFINE_VARIABLE: {
          const value = this.stack.pop()
          const { name, kind } = instr.operand
          this.environment.define(name, value, kind)
          break
        }

        case OpCode.LOAD_VARIABLE: {
          const value = this.environment.get(instr.operand)
          this.stack.push(value)
          break
        }

        case OpCode.CALL_BUILTIN: {
          const { name, argc } = instr.operand
          const fn = this.builtins[name]

          if (!fn) {
            throw new Error(`Unknown builtin function: ${name}`)
          }

          const args = this.stack.splice(-argc)
          const result = await fn(...args)
          this.stack.push(result == null ? null : result)
          break
        }

        case OpCode.POP:
          this.stack.pop()
          break

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
