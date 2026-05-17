import { describe, it, expect } from 'vitest'
import lexerModule from '../src/lexer/lexer.js'
import parserModule from '../src/parser/parser.js'
import compilerModule from '../src/compiler/compiler.js'
import opcodesModule from '../src/compiler/opcodes.js'

const { Lexer } = lexerModule
const { Parser } = parserModule
const { Compiler } = compilerModule
const { OpCode } = opcodesModule

function compileInput(input) {
  const lexer = new Lexer(input)
  const parser = new Parser(lexer)
  const program = parser.parseProgram()
  if (parser.errors.length > 0) {
    throw new Error('Parser errors: ' + parser.errors.join(', '))
  }
  const compiler = new Compiler()
  return compiler.compile(program)
}

describe('Compiler', () => {
  it('should compile basic literal expressions', () => {
    const input = `
      monalisa {
        10
      }
    `
    const instructions = compileInput(input)

    expect(instructions[0].op).toBe(OpCode.LOAD_CONST)
    expect(instructions[0].operand).toEqual({ dest: 0, value: 10 })
    expect(instructions[1].op).toBe(OpCode.HALT)
  })

  it('should compile variable declarations', () => {
    const input = `
      monalisa {
        priyoChange x = 42
      }
    `
    const instructions = compileInput(input)

    expect(instructions[0].op).toBe(OpCode.LOAD_CONST)
    expect(instructions[0].operand).toEqual({ dest: 0, value: 42 })
    expect(instructions[1].op).toBe(OpCode.DEFINE_VARIABLE)
    expect(instructions[1].operand).toEqual({ name: 'x', kind: 'let', src: 0 })
    expect(instructions[2].op).toBe(OpCode.HALT)
  })

  it('should compile binary arithmetic', () => {
    const input = `
      monalisa {
        1 + 2 * 3
      }
    `
    const instructions = compileInput(input)

    expect(instructions[0].op).toBe(OpCode.LOAD_CONST)
    expect(instructions[0].operand).toEqual({ dest: 0, value: 1 })
    expect(instructions[1].op).toBe(OpCode.LOAD_CONST)
    expect(instructions[1].operand).toEqual({ dest: 1, value: 2 })
    expect(instructions[2].op).toBe(OpCode.LOAD_CONST)
    expect(instructions[2].operand).toEqual({ dest: 2, value: 3 })
    expect(instructions[3].op).toBe(OpCode.MUL)
    expect(instructions[3].operand).toEqual(
      expect.objectContaining({
        left: 1,
        right: 2,
      }),
    )
    expect(instructions[4].op).toBe(OpCode.ADD)
    expect(instructions[4].operand).toEqual(
      expect.objectContaining({
        left: 0,
        right: instructions[3].operand.dest,
      }),
    )
    expect(instructions[5].op).toBe(OpCode.HALT)
  })

  it('should compile if statements', () => {
    const input = `
      monalisa {
        prakritiIf (priyoTrue) {
          10
        }
      }
    `
    const instructions = compileInput(input)

    expect(instructions[0].op).toBe(OpCode.LOAD_CONST)
    expect(instructions[0].operand).toEqual({ dest: 0, value: true })

    expect(instructions[1].op).toBe(OpCode.JUMP_IF_FALSE)
    expect(instructions[1].operand).toEqual({ condition: 0, target: 6 })

    expect(instructions[2].op).toBe(OpCode.ENTER_SCOPE)
    expect(instructions[3].op).toBe(OpCode.LOAD_CONST)
    expect(instructions[3].operand).toEqual({ dest: 0, value: 10 })
    expect(instructions[4].op).toBe(OpCode.EXIT_SCOPE)

    expect(instructions[5].op).toBe(OpCode.JUMP)
    expect(instructions[6].op).toBe(OpCode.HALT)

    // Verify jumps are patched
    expect(instructions[1].operand.target).toBe(6)
    expect(instructions[5].operand).toBe(6)
  })

  it('should compile array destructuring declarations', () => {
    const input = `
      monalisa {
        priyoChange [a = 1, [b], c] = [1, [2], 3]
      }
    `
    const instructions = compileInput(input)
    const ops = instructions.map(instr => instr.op)
    expect(ops).toContain(OpCode.BUILD_ARRAY)
    expect(ops).toContain(OpCode.DESTRUCTURE_DEFINE)
  })

  it('should compile user module path imports', () => {
    const input = `
      monalisa {
        lisaaBring "./profile.priyo": [campus, square: sq]
      }
    `
    const instructions = compileInput(input)
    expect(instructions[0].op).toBe(OpCode.IMPORT_MODULE)
    expect(instructions[0].operand.source).toBe('./profile.priyo')
    expect(instructions.some(instr => instr.op === OpCode.GET_PROPERTY)).toBe(true)
    expect(instructions.some(instr => instr.op === OpCode.DEFINE_VARIABLE)).toBe(true)
  })

  it('should reuse registers across independent statements and branches', () => {
    const input = `
      monalisa {
        priyoTell(1)
        priyoTell(2)
        prakritiIf (priyoTrue) {
          priyoTell(1 + 2)
        } prakritiElse {
          priyoTell(3 + 4)
        }
      }
    `
    const instructions = compileInput(input)
    expect(instructions.maxRegisters).toBe(3)
  })

  it('should compile async function declaration metadata and await opcode', () => {
    const input = `
      monalisa {
        prakritiWait lisaaTask addAsync(a, b) {
          priyoGiveBack prakritiPause (a + b)
        }
      }
    `
    const instructions = compileInput(input)
    const defineFn = instructions.find(instr => instr.op === OpCode.DEFINE_FUNCTION)
    expect(defineFn).toBeTruthy()
    expect(defineFn.operand.isAsync).toBe(true)
    expect(defineFn.operand.instructions.some(instr => instr.op === OpCode.AWAIT_VALUE)).toBe(true)
  })

  it('should compile prakritiGo into a spawn opcode', () => {
    const input = `
      monalisa {
        lisaaTask worker(name) {
          priyoGiveBack name
        }
        priyoKeep task = prakritiGo worker("mona")
      }
    `
    const instructions = compileInput(input)
    expect(instructions.some(instr => instr.op === OpCode.SPAWN_TASK)).toBe(true)
  })

  it('should enforce interface method contracts at compile time', () => {
    const input = `
      monalisa {
        lisaaAgreement Greeter {
          lisaaTask greet(name)
        }

        lisaaFamily Student lisaaFollow Greeter {
          lisaaTask greet() {
            priyoGiveBack "Hi"
          }
        }
      }
    `
    expect(() => compileInput(input)).toThrow(/must accept 1 params/i)
  })

  it('should compile generator function metadata and yield opcode', () => {
    const input = `
      monalisa {
        lisaaTask series() {
          prakritiGiveSome 10
          prakritiGiveSome 20
        }
      }
    `
    const instructions = compileInput(input)
    const defineFn = instructions.find(instr => instr.op === OpCode.DEFINE_FUNCTION)
    expect(defineFn).toBeTruthy()
    expect(defineFn.operand.isGenerator).toBe(true)
    expect(defineFn.operand.instructions.some(instr => instr.op === OpCode.YIELD_VALUE)).toBe(true)
  })
})
