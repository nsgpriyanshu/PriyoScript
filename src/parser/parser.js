const { Lexer } = require('../lexer/lexer')
const { TokenType } = require('../lexer/token')
const {
  Program,
  EntryBlock,
  ExpressionStatement,
  VariableDeclaration,
  AssignmentStatement,
  BlockStatement,
  IfStatement,
  BinaryExpression,
  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  CallExpression,
} = require('./ast')

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
    this.errors.push(`${message} (${location})`)
  }

  expectCurrent(type, message) {
    if (this.curToken.type === type) {
      return true
    }
    this.error(message || `Expected ${type} but found ${this.curToken.type}`)
    return false
  }

  consumeCurrent(type, message) {
    if (this.curToken.type === type) {
      this.nextToken()
      return true
    }
    this.error(message || `Expected ${type} but found ${this.curToken.type}`)
    return false
  }

  parseProgram() {
    const entry = this.parseEntryBlock()
    if (!entry) return null
    return new Program(entry)
  }

  // Entry block parsing:
  // monalisa {
  //   ...statements
  // }
  parseEntryBlock() {
    if (this.curToken.type !== TokenType.ENTRY) {
      this.error('Program must start with "monalisa"')
      return null
    }

    this.nextToken()
    if (!this.consumeCurrent(TokenType.LBRACE)) return null

    const body = []
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement()
      if (stmt) {
        body.push(stmt)
      }
    }

    if (!this.consumeCurrent(TokenType.RBRACE)) return null
    return new EntryBlock(body)
  }

  parseStatement() {
    if (this.curToken.type === TokenType.IF) {
      return this.parseIfStatement()
    }

    if (
      this.curToken.type === TokenType.VAR ||
      this.curToken.type === TokenType.LET ||
      this.curToken.type === TokenType.CONST
    ) {
      return this.parseVariableDeclaration()
    }

    // Assignment statement:
    // variableName = expression
    if (this.curToken.type === TokenType.IDENTIFIER && this.peekToken.type === TokenType.ASSIGN) {
      return this.parseAssignmentStatement()
    }

    return this.parseExpressionStatement()
  }

  // Variable declaration logic for:
  // priyoKeep name = ...
  // priyoChange name = ...
  // priyoPromise name = ...
  parseVariableDeclaration() {
    const kindByToken = {
      [TokenType.VAR]: 'var',
      [TokenType.LET]: 'let',
      [TokenType.CONST]: 'const',
    }

    const kind = kindByToken[this.curToken.type]
    this.nextToken()

    if (
      !this.expectCurrent(TokenType.IDENTIFIER, 'Variable name expected after declaration keyword')
    ) {
      this.nextToken()
      return null
    }

    const identifier = new Identifier(this.curToken.literal)
    this.nextToken()

    let initializer = new NullLiteral()

    if (this.curToken.type === TokenType.ASSIGN) {
      this.nextToken()
      initializer = this.parseExpression()
      if (!initializer) return null
    } else if (kind === 'const') {
      this.error('Constant declaration requires an initializer')
      return null
    }

    return new VariableDeclaration(kind, identifier, initializer)
  }

  // Conditional logic:
  // prakritiIf (condition) { ... }
  // prakritiElseIf (condition) { ... }
  // prakritiElse { ... }
  parseIfStatement() {
    const branches = []

    ifBranch: while (true) {
      if (
        this.curToken.type !== TokenType.IF &&
        this.curToken.type !== TokenType.ELIF
      ) {
        break ifBranch
      }

      this.nextToken()
      if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after if/elif keyword')) {
        return null
      }

      const condition = this.parseExpression()
      if (!condition) {
        this.error('Expected condition expression in if/elif')
        return null
      }

      if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after condition')) {
        return null
      }

      const body = this.parseBlockStatement()
      if (!body) {
        return null
      }

      branches.push({ condition, body })

      if (this.curToken.type !== TokenType.ELIF) {
        break
      }
    }

    let alternate = null
    if (this.curToken.type === TokenType.ELSE) {
      this.nextToken()
      alternate = this.parseBlockStatement()
      if (!alternate) return null
    }

    return new IfStatement(branches, alternate)
  }

  parseBlockStatement() {
    if (!this.consumeCurrent(TokenType.LBRACE, 'Expected "{" to start block')) {
      return null
    }

    const statements = []
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement()
      if (stmt) {
        statements.push(stmt)
      }
    }

    if (!this.consumeCurrent(TokenType.RBRACE, 'Expected "}" to close block')) {
      return null
    }

    return new BlockStatement(statements)
  }

  parseAssignmentStatement() {
    const identifier = new Identifier(this.curToken.literal)
    this.nextToken()

    if (!this.consumeCurrent(TokenType.ASSIGN)) return null

    const value = this.parseExpression()
    if (!value) {
      this.error('Assignment value is required')
      return null
    }

    return new AssignmentStatement(identifier, value)
  }

  parseExpressionStatement() {
    const expression = this.parseExpression()
    if (!expression) {
      this.error(`Unexpected token ${this.curToken.type}`)
      this.nextToken()
      return null
    }
    return new ExpressionStatement(expression)
  }

  // Precedence-climbing expression parser.
  // Supports left-associative arithmetic and comparisons:
  // 1 + 2 * 3 -> 1 + (2 * 3)
  // 1 + 2 > 2 -> (1 + 2) > 2
  parseExpression(minPrecedence = 0) {
    let left = this.parsePrimary()
    if (!left) return null

    while (true) {
      const precedence = this.getBinaryPrecedence(this.curToken.type)
      if (precedence < minPrecedence) break

      const operator = this.curToken.type
      this.nextToken()

      const right = this.parseExpression(precedence + 1)
      if (!right) {
        this.error('Right-hand side expression is required')
        return null
      }

      left = new BinaryExpression(left, operator, right)
    }

    return left
  }

  parsePrimary() {
    switch (this.curToken.type) {
      case TokenType.STRING: {
        const node = new StringLiteral(this.curToken.literal)
        this.nextToken()
        return node
      }

      case TokenType.NUMBER: {
        const node = new NumberLiteral(Number(this.curToken.literal))
        this.nextToken()
        return node
      }

      case TokenType.TRUE:
        this.nextToken()
        return new BooleanLiteral(true)

      case TokenType.FALSE:
        this.nextToken()
        return new BooleanLiteral(false)

      case TokenType.NULL:
        this.nextToken()
        return new NullLiteral()

      case TokenType.LPAREN: {
        this.nextToken()
        const expression = this.parseExpression()
        if (!expression) {
          this.error('Expected expression after "("')
          return null
        }
        if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after grouped expression')) {
          return null
        }
        return expression
      }

      case TokenType.PRINT:
      case TokenType.INPUT:
      case TokenType.IDENTIFIER: {
        const callee = new Identifier(this.curToken.literal)
        this.nextToken()

        if (this.curToken.type === TokenType.LPAREN) {
          // priyoTell(...) and priyoListen(...) both go through this shared call parser.
          return this.parseCallExpression(callee)
        }

        return callee
      }

      default:
        return null
    }
  }

  getBinaryPrecedence(tokenType) {
    switch (tokenType) {
      case TokenType.EQ:
      case TokenType.NOT_EQ:
      case TokenType.LT:
      case TokenType.LTE:
      case TokenType.GT:
      case TokenType.GTE:
        return 0
      case TokenType.PLUS:
      case TokenType.MINUS:
        return 1
      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.PERCENT:
        return 2
      default:
        return -1
    }
  }

  parseCallExpression(callee) {
    if (!this.consumeCurrent(TokenType.LPAREN)) return null

    const args = []
    while (this.curToken.type !== TokenType.RPAREN && this.curToken.type !== TokenType.EOF) {
      const arg = this.parseExpression()
      if (!arg) {
        this.error('Invalid function argument')
        return null
      }

      args.push(arg)

      if (this.curToken.type === TokenType.COMMA) {
        this.nextToken()
        continue
      }

      if (this.curToken.type !== TokenType.RPAREN) {
        this.error('Expected "," or ")" in function call')
        return null
      }
    }

    if (!this.consumeCurrent(TokenType.RPAREN)) return null
    return new CallExpression(callee, args)
  }
}

function parse(source) {
  const lexer = new Lexer(source)
  const parser = new Parser(lexer)
  const program = parser.parseProgram()

  if (parser.errors.length > 0) {
    throw new Error(parser.errors.join('\n'))
  }

  return program
}

module.exports = { Parser, parse }
