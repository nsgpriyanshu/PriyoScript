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

        case OpCode.SET_VARIABLE: {
          const value = this.stack.pop()
          this.environment.set(instr.operand, value)
          break
        }

        case OpCode.ADD: {
          const right = this.stack.pop()
          const left = this.stack.pop()
          if (typeof left === 'string' || typeof right === 'string') {
            this.stack.push(String(left) + String(right))
            break
          }
          this.ensureNumbers(left, right, 'ADD')
          this.stack.push(left + right)
          break
        }

        case OpCode.SUB: {
          const right = this.stack.pop()
          const left = this.stack.pop()
          this.ensureNumbers(left, right, 'SUB')
          this.stack.push(left - right)
          break
        }

        case OpCode.MUL: {
          const right = this.stack.pop()
          const left = this.stack.pop()
          this.ensureNumbers(left, right, 'MUL')
          this.stack.push(left * right)
          break
        }

        case OpCode.DIV: {
          const right = this.stack.pop()
          const left = this.stack.pop()
          this.ensureNumbers(left, right, 'DIV')
          if (right === 0) {
            throw new Error('Division by zero')
          }
          this.stack.push(left / right)
          break
        }

        case OpCode.MOD: {
          const right = this.stack.pop()
          const left = this.stack.pop()
          this.ensureNumbers(left, right, 'MOD')
          if (right === 0) {
            throw new Error('Modulo by zero')
          }
          this.stack.push(left % right)
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

  ensureNumbers(left, right, operation) {
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new Error(`${operation} expects numeric operands`)
    }
  }
}

module.exports = { VM }
