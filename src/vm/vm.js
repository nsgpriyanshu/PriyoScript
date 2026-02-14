const { OpCode } = require('../compiler/opcodes')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')

class VM {
  constructor(instructions, options = {}) {
    this.instructions = instructions
    this.environment = options.environment || new Environment(null, { isFunctionScope: true })
    this.builtins = options.builtins || createBuiltins(options.io)
  }

  async run() {
    await this.executeFrame(this.instructions, this.environment, false)
  }

  async executeFrame(instructions, frameEnvironment, isFunctionFrame) {
    const previousEnvironment = this.environment
    this.environment = frameEnvironment

    const stack = []
    let ip = 0

    try {
      while (ip < instructions.length) {
        const instr = instructions[ip]

        switch (instr.op) {
          case OpCode.PUSH_STRING:
          case OpCode.PUSH_NUMBER:
          case OpCode.PUSH_BOOLEAN:
            stack.push(instr.operand)
            break

          case OpCode.PUSH_NULL:
            stack.push(null)
            break

          case OpCode.DEFINE_VARIABLE: {
            const value = stack.pop()
            const { name, kind } = instr.operand
            this.environment.define(name, value, kind)
            break
          }

          case OpCode.LOAD_VARIABLE: {
            const value = this.environment.get(instr.operand)
            stack.push(value)
            break
          }

          case OpCode.SET_VARIABLE: {
            const value = stack.pop()
            this.environment.set(instr.operand, value)
            break
          }

          case OpCode.ADD: {
            const right = stack.pop()
            const left = stack.pop()
            if (typeof left === 'string' || typeof right === 'string') {
              stack.push(String(left) + String(right))
              break
            }
            this.ensureNumbers(left, right, 'ADD')
            stack.push(left + right)
            break
          }

          case OpCode.SUB: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'SUB')
            stack.push(left - right)
            break
          }

          case OpCode.MUL: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'MUL')
            stack.push(left * right)
            break
          }

          case OpCode.DIV: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'DIV')
            if (right === 0) {
              throw new Error('Division by zero')
            }
            stack.push(left / right)
            break
          }

          case OpCode.MOD: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'MOD')
            if (right === 0) {
              throw new Error('Modulo by zero')
            }
            stack.push(left % right)
            break
          }

          case OpCode.EQ: {
            const right = stack.pop()
            const left = stack.pop()
            stack.push(left === right)
            break
          }

          case OpCode.NOT_EQ: {
            const right = stack.pop()
            const left = stack.pop()
            stack.push(left !== right)
            break
          }

          case OpCode.LT: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'LT')
            stack.push(left < right)
            break
          }

          case OpCode.LTE: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'LTE')
            stack.push(left <= right)
            break
          }

          case OpCode.GT: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'GT')
            stack.push(left > right)
            break
          }

          case OpCode.GTE: {
            const right = stack.pop()
            const left = stack.pop()
            this.ensureNumbers(left, right, 'GTE')
            stack.push(left >= right)
            break
          }

          case OpCode.AND: {
            const right = stack.pop()
            const left = stack.pop()
            stack.push(this.isTruthy(left) && this.isTruthy(right))
            break
          }

          case OpCode.OR: {
            const right = stack.pop()
            const left = stack.pop()
            stack.push(this.isTruthy(left) || this.isTruthy(right))
            break
          }

          case OpCode.NOT: {
            const value = stack.pop()
            stack.push(!this.isTruthy(value))
            break
          }

          case OpCode.JUMP_IF_FALSE: {
            const condition = stack.pop()
            if (!this.isTruthy(condition)) {
              ip = instr.operand
              continue
            }
            break
          }

          case OpCode.JUMP:
            if (typeof instr.operand === 'object' && instr.operand !== null) {
              this.unwindScopes(instr.operand.unwind || 0)
              ip = instr.operand.target
              continue
            }

            ip = instr.operand
            continue

          case OpCode.ENTER_SCOPE:
            this.environment = new Environment(this.environment, { isFunctionScope: false })
            break

          case OpCode.EXIT_SCOPE:
            if (!this.environment.parent) {
              throw new Error('Cannot exit global scope')
            }
            this.environment = this.environment.parent
            break

          case OpCode.DEFINE_FUNCTION: {
            const fnObj = {
              type: 'user_function',
              params: instr.operand.params,
              instructions: instr.operand.instructions,
              closure: this.environment,
            }
            this.environment.define(instr.operand.name, fnObj, 'const')
            break
          }

          case OpCode.CALL_NAMED: {
            const { name, argc } = instr.operand
            const args = argc === 0 ? [] : stack.splice(-argc)
            const result = await this.callNamed(name, args)
            stack.push(result == null ? null : result)
            break
          }

          case OpCode.RETURN: {
            if (!isFunctionFrame) {
              throw new Error('Return statement cannot execute outside function')
            }
            const returnValue = stack.pop()
            return { returned: true, value: returnValue == null ? null : returnValue }
          }

          case OpCode.POP:
            stack.pop()
            break

          case OpCode.HALT:
            return { returned: false, value: null }

          default:
            throw new Error(`Unknown opcode: ${instr.op}`)
        }

        ip++
      }

      return { returned: false, value: null }
    } finally {
      this.environment = previousEnvironment
    }
  }

  async callNamed(name, args) {
    if (this.builtins[name]) {
      return await this.builtins[name](...args)
    }

    const callee = this.environment.get(name)
    if (!callee || callee.type !== 'user_function') {
      throw new Error(`Unknown callable: ${name}`)
    }

    if (args.length !== callee.params.length) {
      throw new Error(
        `Function "${name}" expects ${callee.params.length} args but got ${args.length}`,
      )
    }

    const callEnv = new Environment(callee.closure, { isFunctionScope: true })
    for (let i = 0; i < callee.params.length; i++) {
      callEnv.define(callee.params[i], args[i], 'let')
    }

    const result = await this.executeFrame(callee.instructions, callEnv, true)
    return result.value
  }

  ensureNumbers(left, right, operation) {
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new Error(`${operation} expects numeric operands`)
    }
  }

  isTruthy(value) {
    return !!value
  }

  unwindScopes(count) {
    for (let i = 0; i < count; i++) {
      if (!this.environment.parent) {
        throw new Error('Scope underflow during jump unwind')
      }
      this.environment = this.environment.parent
    }
  }
}

module.exports = { VM }
