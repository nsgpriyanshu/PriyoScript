const fs = require('fs')
const path = require('path')
const { Lexer } = require('../src/lexer/lexer')
const { Parser } = require('../src/parser/parser')
const logger = require('../src/utils/logger')

// ---- CLI ARG HANDLING ----
const filePath = process.argv[2]

if (!filePath) {
  logger.error('No input file provided.')
  logger.info('Usage: node src/index.js <file.priyo>')
  process.exit(1)
}

const absolutePath = path.resolve(process.cwd(), filePath)

if (!fs.existsSync(absolutePath)) {
  logger.error(`File not found: ${absolutePath}`)
  process.exit(1)
}

// ---- READ SOURCE ----
const source = fs.readFileSync(absolutePath, 'utf8')
logger.info(`Running ${filePath}`)

// ---- LEXING ----
const lexer = new Lexer(source)
const parser = new Parser(lexer)

// ---- PARSE ----
const program = parser.parseProgram()

if (parser.errors.length > 0) {
  logger.error('Parsing failed:')
  parser.errors.forEach(err => logger.error(err))
  process.exit(1)
}

logger.success('Parsing completed successfully')
