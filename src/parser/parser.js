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
  WhileStatement,
  ForStatement,
  BreakStatement,
  ContinueStatement,
  FunctionDeclaration,
  ReturnStatement,
  ClassDeclaration,
  MethodDeclaration,
  BinaryExpression,
  UnaryExpression,
  ThisExpression,
  SuperExpression,
  MemberExpression,
  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  CallExpression,
  NewExpression,
} = require('./ast')

class Parser {
  constructor(lexer) {
    this.lexer = lexer
    this.curToken = null
    this.peekToken = null
    this.errors = []
    this.loopDepth = 0
    this.functionDepth = 0

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
      if (stmt) body.push(stmt)
    }

    if (!this.consumeCurrent(TokenType.RBRACE)) return null
    return new EntryBlock(body)
  }

  parseStatement() {
    if (this.curToken.type === TokenType.CLASS) return this.parseClassDeclaration()
    if (this.curToken.type === TokenType.RETURN) return this.parseReturnStatement()
    if (this.curToken.type === TokenType.FUNCTION) return this.parseFunctionDeclaration()
    if (this.curToken.type === TokenType.BREAK) return this.parseBreakStatement()
    if (this.curToken.type === TokenType.CONTINUE) return this.parseContinueStatement()
    if (this.curToken.type === TokenType.WHILE) return this.parseWhileStatement()
    if (this.curToken.type === TokenType.FOR) return this.parseForStatement()
    if (this.curToken.type === TokenType.IF) return this.parseIfStatement()

    if (
      this.curToken.type === TokenType.VAR ||
      this.curToken.type === TokenType.LET ||
      this.curToken.type === TokenType.CONST
    ) {
      return this.parseVariableDeclaration()
    }

    if (this.isAssignmentStatementStart()) {
      return this.parseAssignmentStatement()
    }

    return this.parseExpressionStatement()
  }

  parseClassDeclaration() {
    this.nextToken()
    if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected class name after lisaaFamily')) {
      this.nextToken()
      return null
    }

    const name = new Identifier(this.curToken.literal)
    this.nextToken()

    let superClass = null
    if (this.curToken.type === TokenType.EXTENDS) {
      this.nextToken()
      if (
        !this.expectCurrent(TokenType.IDENTIFIER, 'Expected parent class name after lisaaInherit')
      ) {
        this.nextToken()
        return null
      }
      superClass = new Identifier(this.curToken.literal)
      this.nextToken()
    }

    if (!this.consumeCurrent(TokenType.LBRACE, 'Expected "{" after class name')) return null

    const methods = []
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      const method = this.parseMethodDeclaration()
      if (!method) return null
      methods.push(method)
    }

    if (!this.consumeCurrent(TokenType.RBRACE, 'Expected "}" to close class')) return null
    return new ClassDeclaration(name, methods, superClass)
  }

  parseMethodDeclaration() {
    let isStatic = false
    if (this.curToken.type === TokenType.STATIC) {
      isStatic = true
      this.nextToken()
    }

    if (!this.consumeCurrent(TokenType.FUNCTION, 'Expected lisaaTask for class method')) return null

    if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected method name')) {
      this.nextToken()
      return null
    }

    const name = new Identifier(this.curToken.literal)
    this.nextToken()

    if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after method name')) return null
    const params = this.parseParameterList()
    if (!params) return null

    this.functionDepth++
    const body = this.parseBlockStatement()
    this.functionDepth--
    if (!body) return null

    return new MethodDeclaration(name, params, body, isStatic)
  }

  parseFunctionDeclaration() {
    this.nextToken()
    if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected function name after lisaaTask')) {
      this.nextToken()
      return null
    }

    const name = new Identifier(this.curToken.literal)
    this.nextToken()

    if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after function name')) return null
    const params = this.parseParameterList()
    if (!params) return null

    this.functionDepth++
    const body = this.parseBlockStatement()
    this.functionDepth--
    if (!body) return null

    return new FunctionDeclaration(name, params, body)
  }

  parseParameterList() {
    const params = []
    while (this.curToken.type !== TokenType.RPAREN && this.curToken.type !== TokenType.EOF) {
      if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected parameter name')) {
        this.nextToken()
        return null
      }
      params.push(new Identifier(this.curToken.literal))
      this.nextToken()

      if (this.curToken.type === TokenType.COMMA) {
        this.nextToken()
        continue
      }

      if (this.curToken.type !== TokenType.RPAREN) {
        this.error('Expected "," or ")" in function parameters')
        return null
      }
    }

    if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after function parameters'))
      return null
    return params
  }

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

  parseAssignmentStatement() {
    const target = this.parseAssignmentTarget()
    if (!target) return null

    if (!this.consumeCurrent(TokenType.ASSIGN)) return null

    const value = this.parseExpression()
    if (!value) {
      this.error('Assignment value is required')
      return null
    }

    return new AssignmentStatement(target, value)
  }

  parseAssignmentTarget() {
    let target = null

    if (this.curToken.type === TokenType.IDENTIFIER) {
      target = new Identifier(this.curToken.literal)
      this.nextToken()
    } else if (this.curToken.type === TokenType.THIS) {
      target = new ThisExpression()
      this.nextToken()
    } else {
      this.error('Invalid assignment target')
      return null
    }

    while (this.curToken.type === TokenType.DOT) {
      this.nextToken()
      if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected property name after "."')) return null
      target = new MemberExpression(target, new Identifier(this.curToken.literal))
      this.nextToken()
    }

    return target
  }

  parseReturnStatement() {
    if (this.functionDepth === 0) {
      this.error('priyoGiveBack can only be used inside functions')
      this.nextToken()
      return null
    }

    this.nextToken()
    if (
      this.curToken.type === TokenType.RBRACE ||
      this.curToken.type === TokenType.EOF ||
      this.curToken.type === TokenType.SEMICOLON
    ) {
      return new ReturnStatement(null)
    }

    const argument = this.parseExpression()
    if (!argument) {
      this.error('Expected return expression')
      return null
    }

    return new ReturnStatement(argument)
  }

  parseIfStatement() {
    const branches = []

    while (this.curToken.type === TokenType.IF || this.curToken.type === TokenType.ELIF) {
      this.nextToken()
      if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after if/elif keyword')) return null

      const condition = this.parseExpression()
      if (!condition) {
        this.error('Expected condition expression in if/elif')
        return null
      }

      if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after condition')) return null

      const body = this.parseBlockStatement()
      if (!body) return null
      branches.push({ condition, body })
    }

    let alternate = null
    if (this.curToken.type === TokenType.ELSE) {
      this.nextToken()
      alternate = this.parseBlockStatement()
      if (!alternate) return null
    }

    return new IfStatement(branches, alternate)
  }

  parseWhileStatement() {
    this.nextToken()
    if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after while keyword')) return null
    const condition = this.parseExpression()
    if (!condition) {
      this.error('Expected condition expression in while loop')
      return null
    }
    if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after while condition')) return null

    this.loopDepth++
    const body = this.parseBlockStatement()
    this.loopDepth--
    if (!body) return null

    return new WhileStatement(condition, body)
  }

  parseForStatement() {
    this.nextToken()
    if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after for keyword')) return null

    const initializer = this.parseForInitializer()
    if (!this.consumeCurrent(TokenType.SEMICOLON, 'Expected ";" after for initializer')) return null

    let condition = null
    if (this.curToken.type !== TokenType.SEMICOLON) {
      condition = this.parseExpression()
      if (!condition) {
        this.error('Expected condition expression in for loop')
        return null
      }
    }

    if (!this.consumeCurrent(TokenType.SEMICOLON, 'Expected ";" after for condition')) return null
    const update = this.parseForUpdate()
    if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after for clauses')) return null

    this.loopDepth++
    const body = this.parseBlockStatement()
    this.loopDepth--
    if (!body) return null

    return new ForStatement(initializer, condition, update, body)
  }

  parseBreakStatement() {
    if (this.loopDepth === 0) {
      this.error('prakritiStop can only be used inside loops')
      this.nextToken()
      return null
    }
    this.nextToken()
    return new BreakStatement()
  }

  parseContinueStatement() {
    if (this.loopDepth === 0) {
      this.error('prakritiGoOn can only be used inside loops')
      this.nextToken()
      return null
    }
    this.nextToken()
    return new ContinueStatement()
  }

  parseForInitializer() {
    if (this.curToken.type === TokenType.SEMICOLON) return null

    if (
      this.curToken.type === TokenType.VAR ||
      this.curToken.type === TokenType.LET ||
      this.curToken.type === TokenType.CONST
    ) {
      return this.parseVariableDeclaration()
    }

    if (this.isAssignmentStatementStart()) return this.parseAssignmentStatement()
    return this.parseExpressionStatement()
  }

  parseForUpdate() {
    if (this.curToken.type === TokenType.RPAREN) return null
    if (this.isAssignmentStatementStart()) return this.parseAssignmentStatement()
    return this.parseExpressionStatement()
  }

  parseBlockStatement() {
    if (!this.consumeCurrent(TokenType.LBRACE, 'Expected "{" to start block')) return null

    const statements = []
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement()
      if (stmt) statements.push(stmt)
    }

    if (!this.consumeCurrent(TokenType.RBRACE, 'Expected "}" to close block')) return null
    return new BlockStatement(statements)
  }

  parseExpressionStatement() {
    const expression = this.parseExpression()
    if (!expression) {
      if (this.curToken && this.curToken.message) {
        this.error(this.curToken.message)
      } else {
        const shown =
          this.curToken && this.curToken.literal ? this.curToken.literal : this.curToken.type
        this.error(`Could not understand this part: "${shown}"`)
      }
      this.nextToken()
      return null
    }
    return new ExpressionStatement(expression)
  }

  parseExpression(minPrecedence = 0) {
    let left = this.parseUnary()
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

  parseUnary() {
    if (this.curToken.type === TokenType.BANG) {
      const operator = this.curToken.type
      this.nextToken()
      const argument = this.parseUnary()
      if (!argument) {
        this.error('Expected expression after unary operator')
        return null
      }
      return new UnaryExpression(operator, argument)
    }

    if (this.curToken.type === TokenType.NEW) {
      return this.parseNewExpression()
    }

    return this.parsePostfixExpression()
  }

  parseNewExpression() {
    this.nextToken()

    if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected class name after priyoCreate')) {
      this.nextToken()
      return null
    }

    const callee = new Identifier(this.curToken.literal)
    this.nextToken()

    if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after class name')) return null
    const args = this.parseArgumentList()
    if (args == null) return null
    return new NewExpression(callee, args)
  }

  parsePostfixExpression() {
    let expression = this.parsePrimary()
    if (!expression) return null

    while (true) {
      if (this.curToken.type === TokenType.LPAREN) {
        this.nextToken()
        const args = this.parseArgumentList()
        if (args == null) return null
        expression = new CallExpression(expression, args)
        continue
      }

      if (this.curToken.type === TokenType.DOT) {
        this.nextToken()
        if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected property name after "."')) {
          return null
        }
        expression = new MemberExpression(expression, new Identifier(this.curToken.literal))
        this.nextToken()
        continue
      }

      break
    }

    return expression
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

      case TokenType.THIS:
        this.nextToken()
        return new ThisExpression()

      case TokenType.SUPER:
        this.nextToken()
        return new SuperExpression()

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
        const id = new Identifier(this.curToken.literal)
        this.nextToken()
        return id
      }

      default:
        return null
    }
  }

  parseArgumentList() {
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
    return args
  }

  getBinaryPrecedence(tokenType) {
    switch (tokenType) {
      case TokenType.EQ:
      case TokenType.NOT_EQ:
      case TokenType.LT:
      case TokenType.LTE:
      case TokenType.GT:
      case TokenType.GTE:
        return 2
      case TokenType.AND:
        return 1
      case TokenType.OR:
        return 0
      case TokenType.PLUS:
      case TokenType.MINUS:
        return 3
      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.PERCENT:
        return 4
      default:
        return -1
    }
  }

  isAssignmentStatementStart() {
    if (this.curToken.type !== TokenType.IDENTIFIER && this.curToken.type !== TokenType.THIS) {
      return false
    }

    const lexerSnapshot = {
      position: this.lexer.position,
      readPosition: this.lexer.readPosition,
      ch: this.lexer.ch,
      line: this.lexer.line,
      column: this.lexer.column,
    }
    const curSnapshot = this.curToken
    const peekSnapshot = this.peekToken

    try {
      this.nextToken()
      while (this.curToken.type === TokenType.DOT) {
        this.nextToken()
        if (this.curToken.type !== TokenType.IDENTIFIER) return false
        this.nextToken()
      }
      return this.curToken.type === TokenType.ASSIGN
    } finally {
      this.lexer.position = lexerSnapshot.position
      this.lexer.readPosition = lexerSnapshot.readPosition
      this.lexer.ch = lexerSnapshot.ch
      this.lexer.line = lexerSnapshot.line
      this.lexer.column = lexerSnapshot.column
      this.curToken = curSnapshot
      this.peekToken = peekSnapshot
    }
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
