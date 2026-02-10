const fs = require('fs')
const path = require('path')
const { Lexer } = require('./lexer/lexer')
const { Parser } = require('./parser/parser')
const { Compiler } = require('./compiler/compiler')
const logger = require('./utils/logger')

const filePath = process.argv[2]
if (!filePath) {
  logger.error('No input file provided')
  process.exit(1)
}

const absPath = path.resolve(process.cwd(), filePath)
const source = fs.readFileSync(absPath, 'utf8')

const lexer = new Lexer(source)
const parser = new Parser(lexer)
const program = parser.parseProgram()

if (parser.errors.length) {
  parser.errors.forEach(e => logger.error(e))
  process.exit(1)
}

const compiler = new Compiler()
const bytecode = compiler.compile(program)

logger.success('Compilation successful')
console.log(bytecode)
