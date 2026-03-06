import { describe, it, expect } from 'vitest'
import lexerModule from '../src/lexer/lexer.js'
import parserModule from '../src/parser/parser.js'

const { Lexer } = lexerModule
const { Parser } = parserModule

function parse(input) {
  const lexer = new Lexer(input)
  const parser = new Parser(lexer)
  const program = parser.parseProgram()
  return { program, errors: parser.errors }
}

describe('Parser', () => {
  it('should parse an empty entry block', () => {
    const input = 'monalisa { }'
    const { program, errors } = parse(input)

    expect(errors).toHaveLength(0)
    expect(program).not.toBeNull()
    expect(program.type).toBe('Program')
    expect(program.entry.type).toBe('EntryBlock')
    expect(program.entry.body).toHaveLength(0)
  })

  it('should parse variable declarations', () => {
    const input = `
      monalisa {
        priyoKeep x = 10
        priyoChange y = 20
        priyoPromise z = 30
      }
    `
    const { program, errors } = parse(input)

    expect(errors).toHaveLength(0)
    expect(program.entry.body).toHaveLength(3)

    expect(program.entry.body[0].type).toBe('VariableDeclaration')
    expect(program.entry.body[0].kind).toBe('var')
    expect(program.entry.body[0].identifier.name).toBe('x')
    expect(program.entry.body[0].initializer.value).toBe(10)

    expect(program.entry.body[1].kind).toBe('let')
    expect(program.entry.body[2].kind).toBe('const')
  })

  it('should parse arithmetic expressions', () => {
    const input = `
      monalisa {
        priyoKeep result = 5 + 10 * 2
      }
    `
    const { program, errors } = parse(input)

    expect(errors).toHaveLength(0)
    const stmt = program.entry.body[0]
    expect(stmt.initializer.type).toBe('BinaryExpression')
    expect(stmt.initializer.operator).toBe('PLUS')
    expect(stmt.initializer.left.value).toBe(5)

    const right = stmt.initializer.right
    expect(right.type).toBe('BinaryExpression')
    expect(right.operator).toBe('STAR')
    expect(right.left.value).toBe(10)
    expect(right.right.value).toBe(2)
  })

  it('should parse function declarations', () => {
    const input = `
      monalisa {
        lisaaTask add(a, b) {
          priyoGiveBack a + b
        }
      }
    `
    const { program, errors } = parse(input)

    expect(errors).toHaveLength(0)
    const func = program.entry.body[0]
    expect(func.type).toBe('FunctionDeclaration')
    expect(func.name.name).toBe('add')
    expect(func.params).toHaveLength(2)
    expect(func.params[0].name).toBe('a')
    expect(func.params[1].name).toBe('b')
    expect(func.body.statements).toHaveLength(1)
    expect(func.body.statements[0].type).toBe('ReturnStatement')
  })

  it('should parse async function declarations and await expressions', () => {
    const input = `
      monalisa {
        prakritiWait lisaaTask addAsync(a, b) {
          priyoGiveBack prakritiPause (a + b)
        }
      }
    `
    const { program, errors } = parse(input)

    expect(errors).toHaveLength(0)
    const func = program.entry.body[0]
    expect(func.type).toBe('FunctionDeclaration')
    expect(func.isAsync).toBe(true)
    expect(func.body.statements[0].argument.type).toBe('AwaitExpression')
  })

  it('should reject await outside async functions', () => {
    const input = `
      monalisa {
        lisaaTask notAsync() {
          priyoGiveBack prakritiPause 1
        }
      }
    `
    const { errors } = parse(input)
    expect(errors[0]).toMatch(/prakritiPause can only be used inside prakritiWait lisaaTask/i)
  })

  it('should parse array destructuring declarations', () => {
    const input = `
      monalisa {
        priyoChange [first = 1, [second], third] = [10, [20], 30]
        priyoChange {campus, profile: {city = "Kolkata"}} = student
      }
    `
    const { program, errors } = parse(input)

    expect(errors).toHaveLength(0)
    const stmt = program.entry.body[0]
    expect(stmt.type).toBe('VariableDeclaration')
    expect(stmt.identifier.type).toBe('ArrayPattern')
    expect(stmt.identifier.elements[0].type).toBe('DefaultPattern')
    expect(stmt.identifier.elements[1].type).toBe('ArrayPattern')
    const objStmt = program.entry.body[1]
    expect(objStmt.identifier.type).toBe('ObjectPattern')
  })

  it('should parse module box with exports', () => {
    const input = `
      lisaaBox {
        priyoKeep name = "priyo"
        lisaaShare name
      }
    `
    const { program, errors } = parse(input)
    expect(errors).toHaveLength(0)
    expect(program.kind).toBe('package')
    expect(program.root.type).toBe('PackageBlock')
    expect(program.root.body[1].type).toBe('ExportStatement')
  })

  it('should parse import alias and named imports', () => {
    const input = `
      monalisa {
        lisaaBring "./college.priyo": collegeModule
        lisaaBring "./college.priyo": [campus, cgpaToGradePoint: gradeFn]
      }
    `
    const { program, errors } = parse(input)
    expect(errors).toHaveLength(0)
    expect(program.entry.body[0].type).toBe('ImportStatement')
    expect(program.entry.body[0].localName).toBe('collegeModule')
    expect(program.entry.body[1].namedImports).toHaveLength(2)
    expect(program.entry.body[1].namedImports[1].local).toBe('gradeFn')
  })

  it('should parse interface, implements, and access modifiers', () => {
    const input = `
      monalisa {
        lisaaAgreement Greeter {
          lisaaTask greet(name)
        }

        lisaaFamily Student lisaaFollow Greeter {
          lisaaOpen lisaaTask greet(name) {
            priyoGiveBack "Hi " + name
          }
          lisaaPersonal priyoKeep secretCode = "X1"
        }
      }
    `
    const { program, errors } = parse(input)
    expect(errors).toHaveLength(0)

    const iface = program.entry.body[0]
    expect(iface.type).toBe('InterfaceDeclaration')
    expect(iface.name.name).toBe('Greeter')
    expect(iface.methods[0].name.name).toBe('greet')

    const cls = program.entry.body[1]
    expect(cls.type).toBe('ClassDeclaration')
    expect(cls.implementedInterfaces[0].name).toBe('Greeter')
    expect(cls.methods[0].access).toBe('public')
    expect(cls.fields[0].access).toBe('private')
  })
})
