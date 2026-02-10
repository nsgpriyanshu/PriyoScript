const { Lexer } = require('../lexer/lexer')
const { TokenType } = require('../lexer/token')
const { Program, EntryBlock, ExpressionStatement } = require('./ast')

class Parser {
  constructor(lexer) {
    this.lexer = lexer

    this.curToken = null
    this.peekToken = null
    this.errors = []

    this.nextToken()
    this.nextToken()
  }

  nextToken() {
    this.curToken = this.peekToken
    this.peekToken = this.lexer.nextToken()
  }

  error(message) {
    const location = this.curToken
      ? `line ${this.curToken.line}, column ${this.curToken.column}`
      : 'unknown location'

    this.errors.push(`❌ ${message} (${location})`)
  }

  expect(type) {
    if (this.curToken.type === type) {
      this.nextToken()
      return true
    }

    this.error(`Expected ${type} but found ${this.curToken.type}`)
    return false
  }

  parseProgram() {
    const entry = this.parseEntryBlock()
    if (!entry) return null
    return new Program(entry)
  }

  // monalisa { ... }
  parseEntryBlock() {
    if (this.curToken.type !== TokenType.ENTRY) {
      this.error('Program must start with "monalisa"')
      return null
    }

    this.nextToken()

    if (!this.expect(TokenType.LBRACE)) return null

    const body = []

    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement()
      if (stmt) body.push(stmt)
    }

    if (!this.expect(TokenType.RBRACE)) return null

    return new EntryBlock(body)
  }

  parseStatement() {
    if (this.curToken.type === TokenType.PRINT) {
      return this.parsePrintCall()
    }

    this.error(`Unexpected token ${this.curToken.type}`)
    this.nextToken()
    return null
  }

  parsePrintCall() {
    const token = this.curToken // priyoTell
    this.nextToken()

    if (!this.expect(TokenType.LPAREN)) return null

    const value = this.curToken.literal
    if (!this.expect(TokenType.STRING)) return null

    if (!this.expect(TokenType.RPAREN)) return null

    return new ExpressionStatement({
      type: 'CallExpression',
      callee: token.literal,
      arguments: [{ type: 'StringLiteral', value }],
    })
  }
}

/* 🔥 THIS IS THE MISSING PIECE */
function parse(source) {
  const lexer = new Lexer(source)
  const parser = new Parser(lexer)
  const program = parser.parseProgram()

  if (parser.errors.length > 0) {
    parser.errors.forEach(e => console.error(e))
    process.exit(1)
  }

  return program
}

module.exports = { Parser, parse }
