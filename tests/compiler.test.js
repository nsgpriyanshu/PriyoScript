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

    // expression statement pushes then pops.
    expect(instructions[0].op).toBe(OpCode.PUSH_NUMBER)
    expect(instructions[0].operand).toBe(10)
    expect(instructions[1].op).toBe(OpCode.POP)
    expect(instructions[2].op).toBe(OpCode.HALT)
  })

  it('should compile variable declarations', () => {
    const input = `
      monalisa {
        priyoChange x = 42
      }
    `
    const instructions = compileInput(input)

    expect(instructions[0].op).toBe(OpCode.PUSH_NUMBER)
    expect(instructions[0].operand).toBe(42)
    expect(instructions[1].op).toBe(OpCode.DEFINE_VARIABLE)
    expect(instructions[1].operand).toEqual({ name: 'x', kind: 'let' })
    expect(instructions[2].op).toBe(OpCode.HALT)
  })

  it('should compile binary arithmetic', () => {
    const input = `
      monalisa {
        1 + 2 * 3
      }
    `
    const instructions = compileInput(input)

    expect(instructions[0].op).toBe(OpCode.PUSH_NUMBER)
    expect(instructions[0].operand).toBe(1) // left
    expect(instructions[1].op).toBe(OpCode.PUSH_NUMBER)
    expect(instructions[1].operand).toBe(2) // right.left
    expect(instructions[2].op).toBe(OpCode.PUSH_NUMBER)
    expect(instructions[2].operand).toBe(3) // right.right
    expect(instructions[3].op).toBe(OpCode.MUL)
    expect(instructions[4].op).toBe(OpCode.ADD)
    expect(instructions[5].op).toBe(OpCode.POP)
    expect(instructions[6].op).toBe(OpCode.HALT)
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

    expect(instructions[0].op).toBe(OpCode.PUSH_BOOLEAN)
    expect(instructions[0].operand).toBe(true)

    expect(instructions[1].op).toBe(OpCode.JUMP_IF_FALSE)

    expect(instructions[2].op).toBe(OpCode.ENTER_SCOPE)
    expect(instructions[3].op).toBe(OpCode.PUSH_NUMBER)
    expect(instructions[3].operand).toBe(10)
    expect(instructions[4].op).toBe(OpCode.POP)
    expect(instructions[5].op).toBe(OpCode.EXIT_SCOPE)

    expect(instructions[6].op).toBe(OpCode.JUMP)
    expect(instructions[7].op).toBe(OpCode.HALT)

    // Verify jumps are patched
    expect(instructions[1].operand).toBe(7) // Jump over if block and JUMP instruction
    expect(instructions[6].operand).toBe(7) // Forward JUMP points to HALT
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
})
