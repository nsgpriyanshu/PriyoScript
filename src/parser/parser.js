const { Lexer } = require('../lexer/lexer')
const { TokenType } = require('../lexer/token')
const { createSyntaxError, classifySyntaxCode } = require('../errors')
const { suggestForExpectedToken, findClosestKeyword } = require('../errors/suggestions')
const {
  Program,
  EntryBlock,
  PackageBlock,
  ExpressionStatement,
  VariableDeclaration,
  AssignmentStatement,
  BlockStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ForEachStatement,
  SwitchStatement,
  SwitchCase,
  BreakStatement,
  ContinueStatement,
  FunctionDeclaration,
  ReturnStatement,
  ImportStatement,
  ExportStatement,
  TryStatement,
  CatchClause,
  ThrowStatement,
  ClassDeclaration,
  MethodDeclaration,
  ClassFieldDeclaration,
  BinaryExpression,
  UnaryExpression,
  ThisExpression,
  SuperExpression,
  MemberExpression,
  IndexExpression,
  SliceExpression,
  Identifier,
  ArrayPattern,
  ObjectPattern,
  ObjectPatternProperty,
  DefaultPattern,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  ArrayLiteral,
  CallExpression,
  NewExpression,
} = require('./ast')

class Parser {
  constructor(lexer) {
    this.lexer = lexer
    this.curToken = null
    this.peekToken = null
    this.errors = []
    this.errorDetails = []
    this.loopDepth = 0
    this.switchDepth = 0
    this.functionDepth = 0
    this.classMethodDepth = 0

    this.nextToken()
    this.nextToken()
  }

  nextToken() {
    this.curToken = this.peekToken
    this.peekToken = this.lexer.nextToken()
  }

  error(message) {
    const token = this.curToken
    const line = token && token.line ? token.line : null
    const column = token && token.column ? token.column : null
    const literalLength = token && token.literal ? String(token.literal).length : 1
    const endColumn = column == null ? null : column + Math.max(0, literalLength - 1)
    const location =
      line != null && column != null ? `line ${line}, column ${column}` : 'unknown location'

    const detail = {
      message,
      line,
      column,
      endColumn,
      token: token ? token.literal : null,
      sourceLine: this.getSourceLine(line),
      suggestion: this.getSuggestionForCurrentToken(),
    }

    this.errorDetails.push(detail)
    this.errors.push(`${message} (${location})`)
  }

  getSourceLine(lineNumber) {
    if (!lineNumber || lineNumber < 1) return null
    const lines = String(this.lexer && this.lexer.input ? this.lexer.input : '').split('\n')
    return lines[lineNumber - 1] || null
  }

  getSuggestionForCurrentToken(expectedTokenType = null) {
    if (!this.curToken || this.curToken.type !== TokenType.IDENTIFIER) return null
    const value = this.curToken.literal
    if (expectedTokenType) {
      return suggestForExpectedToken(value, expectedTokenType)
    }
    return findClosestKeyword(value)
  }

  expectCurrent(type, message) {
    if (this.curToken.type === type) {
      return true
    }
    const withSuggestion =
      this.curToken.type === TokenType.IDENTIFIER
        ? this.withExpectedTokenSuggestion(
            message || `Expected ${type} but found ${this.curToken.type}`,
            type,
          )
        : message || `Expected ${type} but found ${this.curToken.type}`
    this.error(withSuggestion)
    return false
  }

  consumeCurrent(type, message) {
    if (this.curToken.type === type) {
      this.nextToken()
      return true
    }
    const withSuggestion =
      this.curToken.type === TokenType.IDENTIFIER
        ? this.withExpectedTokenSuggestion(
            message || `Expected ${type} but found ${this.curToken.type}`,
            type,
          )
        : message || `Expected ${type} but found ${this.curToken.type}`
    this.error(withSuggestion)
    return false
  }

  withExpectedTokenSuggestion(baseMessage, expectedTokenType) {
    const suggestion = this.getSuggestionForCurrentToken(expectedTokenType)
    if (!suggestion) return baseMessage
    return `${baseMessage}. Did you mean "${suggestion}"?`
  }

  parseProgram() {
    if (this.curToken.type === TokenType.ENTRY) {
      const entry = this.parseEntryBlock()
      if (!entry) return null
      return new Program(entry, 'entry')
    }

    if (this.curToken.type === TokenType.PACKAGE) {
      const pkg = this.parsePackageBlock()
      if (!pkg) return null
      return new Program(pkg, 'package')
    }

    const suggestion = this.getSuggestionForCurrentToken()
    const message = suggestion
      ? `Program must start with "monalisa" or "lisaaBox". Did you mean "${suggestion}"?`
      : 'Program must start with "monalisa" or "lisaaBox"'
    this.error(message)
    return null
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

  parsePackageBlock() {
    this.nextToken()
    if (!this.consumeCurrent(TokenType.LBRACE, 'Expected "{" after lisaaBox')) return null

    const body = []
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      const stmt = this.parseStatement()
      if (stmt) body.push(stmt)
    }

    if (!this.consumeCurrent(TokenType.RBRACE, 'Expected "}" after lisaaBox block')) return null
    return new PackageBlock(body)
  }

  parseStatement() {
    if (this.curToken.type === TokenType.EXPORT) return this.parseExportStatement()
    if (this.curToken.type === TokenType.CLASS) return this.parseClassDeclaration()
    if (this.curToken.type === TokenType.IMPORT) return this.parseImportStatement()
    if (this.curToken.type === TokenType.RETURN) return this.parseReturnStatement()
    if (this.curToken.type === TokenType.THROW) return this.parseThrowStatement()
    if (this.curToken.type === TokenType.TRY) return this.parseTryStatement()
    if (this.curToken.type === TokenType.FUNCTION) return this.parseFunctionDeclaration()
    if (this.curToken.type === TokenType.BREAK) return this.parseBreakStatement()
    if (this.curToken.type === TokenType.CONTINUE) return this.parseContinueStatement()
    if (this.curToken.type === TokenType.SWITCH) return this.parseSwitchStatement()
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
      if (superClass.name === name.name) {
        this.error('A class cannot inherit from itself')
        return null
      }
      this.nextToken()
    }

    if (!this.consumeCurrent(TokenType.LBRACE, 'Expected "{" after class name')) return null

    const methods = []
    const fields = []
    const instanceMemberNames = new Set()
    const staticMemberNames = new Set()
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      const member = this.parseClassMember()
      if (!member) return null

      if (member.type === 'MethodDeclaration') {
        const seenNames = member.isStatic ? staticMemberNames : instanceMemberNames
        if (seenNames.has(member.name.name)) {
          this.error(
            `Duplicate ${member.isStatic ? 'static ' : ''}member "${member.name.name}" in class "${name.name}"`,
          )
          return null
        }
        seenNames.add(member.name.name)
        methods.push(member)
      } else if (member.type === 'ClassFieldDeclaration') {
        const seenNames = member.isStatic ? staticMemberNames : instanceMemberNames
        if (seenNames.has(member.name.name)) {
          this.error(
            `Duplicate ${member.isStatic ? 'static ' : ''}member "${member.name.name}" in class "${name.name}"`,
          )
          return null
        }
        seenNames.add(member.name.name)
        fields.push(member)
      } else {
        this.error('Unknown class member')
        return null
      }
    }

    if (!this.consumeCurrent(TokenType.RBRACE, 'Expected "}" to close class')) return null
    return new ClassDeclaration(name, methods, fields, superClass)
  }

  parseClassMember() {
    let isStatic = false
    if (this.curToken.type === TokenType.STATIC) {
      isStatic = true
      this.nextToken()
    }

    if (this.curToken.type === TokenType.FUNCTION) {
      return this.parseMethodDeclaration(isStatic)
    }

    if (
      this.curToken.type === TokenType.VAR ||
      this.curToken.type === TokenType.LET ||
      this.curToken.type === TokenType.CONST
    ) {
      return this.parseClassFieldDeclaration(isStatic)
    }

    this.error('Class member must be a method or field declaration')
    return null
  }

  parseMethodDeclaration(isStatic = false) {
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
    // Track class-method context so priyoSelf/priyoParent are validated.
    this.classMethodDepth++
    const body = this.parseBlockStatement()
    this.classMethodDepth--
    this.functionDepth--
    if (!body) return null

    return new MethodDeclaration(name, params, body, isStatic)
  }

  parseClassFieldDeclaration(isStatic = false) {
    const kindByToken = {
      [TokenType.VAR]: 'var',
      [TokenType.LET]: 'let',
      [TokenType.CONST]: 'const',
    }

    const kind = kindByToken[this.curToken.type]
    this.nextToken()

    if (
      !this.expectCurrent(TokenType.IDENTIFIER, 'Expected field name after declaration keyword')
    ) {
      this.nextToken()
      return null
    }
    const name = new Identifier(this.curToken.literal)
    this.nextToken()

    let initializer = new NullLiteral()
    if (this.curToken.type === TokenType.ASSIGN) {
      this.nextToken()
      initializer = this.parseExpression()
      if (!initializer) return null
    } else if (kind === 'const') {
      this.error('Constant field declaration requires an initializer')
      return null
    }

    return new ClassFieldDeclaration(name, kind, initializer, isStatic)
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

  parseImportStatement() {
    this.nextToken()

    if (
      this.curToken.type !== TokenType.IDENTIFIER &&
      this.curToken.type !== TokenType.STRING &&
      this.curToken.type !== TokenType.PRINT &&
      this.curToken.type !== TokenType.INPUT
    ) {
      this.error('Expected package name after lisaaBring')
      return null
    }

    const source = this.curToken.literal
    const sourceType = this.curToken.type === TokenType.STRING ? 'string' : 'identifier'
    let localName =
      sourceType === 'string' ? this.deriveModuleLocalName(source) : this.curToken.literal
    const namedImports = []
    this.nextToken()

    if (this.curToken.type === TokenType.COLON) {
      this.nextToken()
      if (this.curToken.type === TokenType.LBRACKET) {
        this.nextToken()
        while (this.curToken.type !== TokenType.RBRACKET && this.curToken.type !== TokenType.EOF) {
          if (
            !this.expectCurrent(TokenType.IDENTIFIER, 'Expected export name in named import list')
          ) {
            this.nextToken()
            return null
          }
          const exportedName = this.curToken.literal
          this.nextToken()

          let localImportedName = exportedName
          if (this.curToken.type === TokenType.COLON) {
            this.nextToken()
            if (
              !this.expectCurrent(
                TokenType.IDENTIFIER,
                'Expected alias name after ":" in named import',
              )
            ) {
              this.nextToken()
              return null
            }
            localImportedName = this.curToken.literal
            this.nextToken()
          }

          namedImports.push({
            imported: exportedName,
            local: localImportedName,
          })

          if (this.curToken.type === TokenType.COMMA) {
            this.nextToken()
            continue
          }

          if (this.curToken.type !== TokenType.RBRACKET) {
            this.error('Expected "," or "]" in named import list')
            return null
          }
        }

        if (!this.consumeCurrent(TokenType.RBRACKET, 'Expected "]" after named import list'))
          return null
      } else {
        if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected alias name after ":" in import')) {
          this.nextToken()
          return null
        }
        localName = this.curToken.literal
        this.nextToken()
      }
    }

    return new ImportStatement(source, localName, sourceType, namedImports)
  }

  parseExportStatement() {
    this.nextToken()
    if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected identifier after lisaaShare')) {
      this.nextToken()
      return null
    }

    const identifier = new Identifier(this.curToken.literal)
    this.nextToken()
    return new ExportStatement(identifier)
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

    let identifier
    if (this.curToken.type === TokenType.LBRACKET || this.curToken.type === TokenType.LBRACE) {
      identifier = this.parseBindingPattern()
      if (!identifier) return null
    } else {
      if (
        !this.expectCurrent(
          TokenType.IDENTIFIER,
          'Variable name expected after declaration keyword',
        )
      ) {
        this.nextToken()
        return null
      }

      identifier = new Identifier(this.curToken.literal)
      this.nextToken()
    }

    let initializer = new NullLiteral()
    if (this.curToken.type === TokenType.ASSIGN) {
      this.nextToken()
      initializer = this.parseExpression()
      if (!initializer) return null
    } else if (identifier.type !== 'Identifier') {
      this.error('Destructuring declaration requires an initializer')
      return null
    } else if (kind === 'const') {
      this.error('Constant declaration requires an initializer')
      return null
    }

    return new VariableDeclaration(kind, identifier, initializer)
  }

  parseBindingPattern() {
    if (this.curToken.type === TokenType.LBRACKET) {
      return this.parseArrayBindingPattern()
    }
    if (this.curToken.type === TokenType.LBRACE) {
      return this.parseObjectBindingPattern()
    }
    if (this.curToken.type === TokenType.IDENTIFIER) {
      const id = new Identifier(this.curToken.literal)
      this.nextToken()
      return id
    }
    this.error('Expected a binding pattern')
    return null
  }

  parseArrayBindingPattern() {
    if (!this.consumeCurrent(TokenType.LBRACKET, 'Expected "[" to start array destructuring'))
      return null

    const elements = []
    while (this.curToken.type !== TokenType.RBRACKET && this.curToken.type !== TokenType.EOF) {
      if (this.curToken.type === TokenType.COMMA) {
        // Allow holes: [first, , third]
        elements.push(null)
        this.nextToken()
        continue
      }

      const pattern = this.parseBindingPattern()
      if (!pattern) return null

      let element = pattern
      if (this.curToken.type === TokenType.ASSIGN) {
        this.nextToken()
        const defaultValue = this.parseExpression()
        if (!defaultValue) {
          this.error('Expected default value in array destructuring')
          return null
        }
        element = new DefaultPattern(pattern, defaultValue)
      }
      elements.push(element)

      if (this.curToken.type === TokenType.COMMA) {
        this.nextToken()
        continue
      }

      if (this.curToken.type !== TokenType.RBRACKET) {
        this.error('Expected "," or "]" in array destructuring')
        return null
      }
    }

    if (!this.consumeCurrent(TokenType.RBRACKET, 'Expected "]" after array destructuring'))
      return null
    return new ArrayPattern(elements)
  }

  parseObjectBindingPattern() {
    if (!this.consumeCurrent(TokenType.LBRACE, 'Expected "{" to start object destructuring'))
      return null

    const properties = []
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      if (
        !this.expectCurrent(TokenType.IDENTIFIER, 'Expected property name in object destructuring')
      ) {
        this.nextToken()
        return null
      }

      const key = this.curToken.literal
      this.nextToken()

      let valuePattern
      if (this.curToken.type === TokenType.COLON) {
        this.nextToken()
        valuePattern = this.parseBindingPattern()
        if (!valuePattern) return null
      } else {
        valuePattern = new Identifier(key)
      }

      if (this.curToken.type === TokenType.ASSIGN) {
        this.nextToken()
        const defaultValue = this.parseExpression()
        if (!defaultValue) {
          this.error('Expected default value in object destructuring')
          return null
        }
        valuePattern = new DefaultPattern(valuePattern, defaultValue)
      }

      properties.push(new ObjectPatternProperty(key, valuePattern))

      if (this.curToken.type === TokenType.COMMA) {
        this.nextToken()
        continue
      }

      if (this.curToken.type !== TokenType.RBRACE) {
        this.error('Expected "," or "}" in object destructuring')
        return null
      }
    }

    if (!this.consumeCurrent(TokenType.RBRACE, 'Expected "}" after object destructuring'))
      return null
    return new ObjectPattern(properties)
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
    let target

    if (this.curToken.type === TokenType.IDENTIFIER) {
      target = new Identifier(this.curToken.literal)
      this.nextToken()
    } else if (this.curToken.type === TokenType.THIS) {
      if (this.classMethodDepth === 0) {
        this.error('priyoSelf can only be used inside class methods')
        return null
      }
      target = new ThisExpression()
      this.nextToken()
    } else if (this.curToken.type === TokenType.SUPER) {
      if (this.classMethodDepth === 0) {
        this.error('priyoParent can only be used inside class methods')
        return null
      }
      target = new SuperExpression()
      this.nextToken()
    } else {
      this.error('Invalid assignment target')
      return null
    }

    // Allow nested targets like:
    // priyoSelf.profile.name = ...
    // scores[0] = ...
    // user.posts[1].title = ...
    while (this.curToken.type === TokenType.DOT || this.curToken.type === TokenType.LBRACKET) {
      if (this.curToken.type === TokenType.DOT) {
        this.nextToken()
        if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected property name after "."')) {
          return null
        }
        target = new MemberExpression(target, new Identifier(this.curToken.literal))
        this.nextToken()
        continue
      }

      this.nextToken()
      const indexExpression = this.parseExpression()
      if (!indexExpression) {
        this.error('Expected index expression inside "[...]"')
        return null
      }
      if (!this.consumeCurrent(TokenType.RBRACKET, 'Expected "]" after index expression')) {
        return null
      }
      target = new IndexExpression(target, indexExpression)
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

  parseThrowStatement() {
    this.nextToken()
    const argument = this.parseExpression()
    if (!argument) {
      this.error('Expected expression after prakritiThrow')
      return null
    }
    return new ThrowStatement(argument)
  }

  parseTryStatement() {
    this.nextToken()
    const tryBlock = this.parseBlockStatement()
    if (!tryBlock) return null

    let handler = null
    if (this.curToken.type === TokenType.CATCH) {
      this.nextToken()
      let catchParam = null

      if (this.curToken.type === TokenType.LPAREN) {
        this.nextToken()
        if (!this.expectCurrent(TokenType.IDENTIFIER, 'Expected catch variable name')) {
          this.nextToken()
          return null
        }
        catchParam = new Identifier(this.curToken.literal)
        this.nextToken()
        if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after catch variable')) return null
      }

      const catchBody = this.parseBlockStatement()
      if (!catchBody) return null
      handler = new CatchClause(catchParam, catchBody)
    }

    let finalizer = null
    if (this.curToken.type === TokenType.FINALLY) {
      this.nextToken()
      finalizer = this.parseBlockStatement()
      if (!finalizer) return null
    }

    if (!handler && !finalizer) {
      this.error('Try block requires catch and/or finally')
      return null
    }

    return new TryStatement(tryBlock, handler, finalizer)
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

    // Iteration-friendly foreach syntax:
    // prakritiCount (item priyoInside items) { ... }
    if (this.isForEachHeaderStart()) {
      return this.parseForEachStatement()
    }

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

  parseForEachStatement() {
    const item = new Identifier(this.curToken.literal)
    this.nextToken()

    if (!this.consumeCurrent(TokenType.IN, 'Expected priyoInside between item and iterable'))
      return null

    const iterable = this.parseExpression()
    if (!iterable) {
      this.error('Expected iterable expression after priyoInside')
      return null
    }

    if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after foreach header')) return null

    this.loopDepth++
    const body = this.parseBlockStatement()
    this.loopDepth--
    if (!body) return null

    return new ForEachStatement(item, iterable, body)
  }

  parseSwitchStatement() {
    this.nextToken()
    if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after switch keyword')) return null

    const discriminant = this.parseExpression()
    if (!discriminant) {
      this.error('Expected switch expression')
      return null
    }

    if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after switch expression')) return null
    if (!this.consumeCurrent(TokenType.LBRACE, 'Expected "{" after switch header')) return null

    const cases = []
    let defaultCase = null

    this.switchDepth++
    while (this.curToken.type !== TokenType.RBRACE && this.curToken.type !== TokenType.EOF) {
      if (this.curToken.type === TokenType.CASE) {
        this.nextToken()
        if (!this.consumeCurrent(TokenType.LPAREN, 'Expected "(" after case keyword')) {
          this.switchDepth--
          return null
        }

        const test = this.parseExpression()
        if (!test) {
          this.error('Expected case test expression')
          this.switchDepth--
          return null
        }

        if (!this.consumeCurrent(TokenType.RPAREN, 'Expected ")" after case test')) {
          this.switchDepth--
          return null
        }

        const consequent = this.parseBlockStatement()
        if (!consequent) {
          this.switchDepth--
          return null
        }
        cases.push(new SwitchCase(test, consequent))
        continue
      }

      if (this.curToken.type === TokenType.DEFAULT) {
        if (defaultCase) {
          this.error('Switch can only have one default block')
          this.switchDepth--
          return null
        }
        this.nextToken()
        defaultCase = this.parseBlockStatement()
        if (!defaultCase) {
          this.switchDepth--
          return null
        }
        continue
      }

      this.error('Switch body must contain only case/default blocks')
      this.switchDepth--
      return null
    }
    this.switchDepth--

    if (!this.consumeCurrent(TokenType.RBRACE, 'Expected "}" to close switch')) return null
    return new SwitchStatement(discriminant, cases, defaultCase)
  }

  parseBreakStatement() {
    if (this.loopDepth === 0 && this.switchDepth === 0) {
      this.error('prakritiStop can only be used inside loops or switch')
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
    const errorCountBefore = this.errors.length
    const expression = this.parseExpression()
    if (!expression) {
      if (this.errors.length === errorCountBefore) {
        if (this.curToken && this.curToken.message) {
          this.error(this.curToken.message)
        } else {
          const shown =
            this.curToken && this.curToken.literal ? this.curToken.literal : this.curToken.type
          const keywordSuggestion = this.getSuggestionForCurrentToken()
          if (keywordSuggestion) {
            this.error(
              `Could not understand this part: "${shown}". Did you mean "${keywordSuggestion}"?`,
            )
          } else {
            this.error(`Could not understand this part: "${shown}"`)
          }
        }
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

      if (this.curToken.type === TokenType.LBRACKET) {
        this.nextToken()
        const indexed = this.parseIndexOrSliceExpression(expression)
        if (!indexed) return null
        expression = indexed
        continue
      }

      break
    }

    return expression
  }

  parsePrimary() {
    switch (this.curToken.type) {
      case TokenType.LBRACKET:
        return this.parseArrayLiteral()

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
        if (this.classMethodDepth === 0) {
          this.error('priyoSelf can only be used inside class methods')
          return null
        }
        this.nextToken()
        return new ThisExpression()

      case TokenType.SUPER:
        if (this.classMethodDepth === 0) {
          this.error('priyoParent can only be used inside class methods')
          return null
        }
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

  parseArrayLiteral() {
    const elements = []
    // Array literal grammar: [expr, expr, ...]
    this.nextToken() // consume '['

    while (this.curToken.type !== TokenType.RBRACKET && this.curToken.type !== TokenType.EOF) {
      const element = this.parseExpression()
      if (!element) {
        this.error('Invalid array element expression')
        return null
      }
      elements.push(element)

      if (this.curToken.type === TokenType.COMMA) {
        this.nextToken()
        continue
      }

      if (this.curToken.type !== TokenType.RBRACKET) {
        this.error('Expected "," or "]" in array literal')
        return null
      }
    }

    if (!this.consumeCurrent(TokenType.RBRACKET, 'Expected "]" after array literal')) return null
    return new ArrayLiteral(elements)
  }

  parseIndexOrSliceExpression(objectExpression) {
    // [:end] / [:] slices.
    if (this.curToken.type === TokenType.COLON) {
      this.nextToken()

      let end = null
      if (this.curToken.type !== TokenType.RBRACKET) {
        end = this.parseExpression()
        if (!end) {
          this.error('Expected slice end expression after ":"')
          return null
        }
      }

      if (!this.consumeCurrent(TokenType.RBRACKET, 'Expected "]" after slice expression')) {
        return null
      }

      return new SliceExpression(objectExpression, null, end)
    }

    // [start] or [start:end]
    const firstExpression = this.parseExpression()
    if (!firstExpression) {
      this.error('Expected index expression inside "[...]"')
      return null
    }

    if (this.curToken.type === TokenType.COLON) {
      this.nextToken()

      let end = null
      if (this.curToken.type !== TokenType.RBRACKET) {
        end = this.parseExpression()
        if (!end) {
          this.error('Expected slice end expression after ":"')
          return null
        }
      }

      if (!this.consumeCurrent(TokenType.RBRACKET, 'Expected "]" after slice expression')) {
        return null
      }

      return new SliceExpression(objectExpression, firstExpression, end)
    }

    if (!this.consumeCurrent(TokenType.RBRACKET, 'Expected "]" after index expression')) {
      return null
    }
    return new IndexExpression(objectExpression, firstExpression)
  }

  parseArgumentList() {
    const args = []
    while (this.curToken.type !== TokenType.RPAREN && this.curToken.type !== TokenType.EOF) {
      const errorCountBefore = this.errors.length
      const arg = this.parseExpression()
      if (!arg) {
        if (this.errors.length === errorCountBefore) {
          this.error('Invalid function argument')
        }
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
    if (
      this.curToken.type !== TokenType.IDENTIFIER &&
      this.curToken.type !== TokenType.THIS &&
      this.curToken.type !== TokenType.SUPER
    ) {
      return false
    }

    // Lightweight lookahead to decide if this starts an assignment target.
    const lexerSnapshot = {
      position: this.lexer.position,
      readPosition: this.lexer.readPosition,
      ch: this.lexer.ch,
      line: this.lexer.line,
      column: this.lexer.column,
    }
    const curSnapshot = this.curToken
    const peekSnapshot = this.peekToken
    const errorCountSnapshot = this.errors.length

    try {
      this.nextToken()
      while (this.curToken.type === TokenType.DOT || this.curToken.type === TokenType.LBRACKET) {
        if (this.curToken.type === TokenType.DOT) {
          this.nextToken()
          if (this.curToken.type !== TokenType.IDENTIFIER) return false
          this.nextToken()
          continue
        }

        this.nextToken()
        if (this.curToken.type === TokenType.COLON) return false
        const indexExpression = this.parseExpression()
        if (!indexExpression) return false
        if (this.curToken.type === TokenType.COLON) return false
        if (this.curToken.type !== TokenType.RBRACKET) return false
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
      this.errors.length = errorCountSnapshot
    }
  }

  isForEachHeaderStart() {
    if (this.curToken.type !== TokenType.IDENTIFIER) return false
    return this.peekToken && this.peekToken.type === TokenType.IN
  }

  deriveModuleLocalName(modulePath) {
    const normalized = String(modulePath || '')
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      .replace(/\.priyo$/i, '')
      .trim()
    const safe = normalized.replace(/[^a-zA-Z0-9_]/g, '_')
    return safe || 'module'
  }
}

function parse(source) {
  const lexer = new Lexer(source)
  const parser = new Parser(lexer)
  const program = parser.parseProgram()

  if (parser.errors.length > 0) {
    const message = parser.errors.join('\n')
    const firstDetail = parser.errorDetails[0] || null
    const line = firstDetail ? firstDetail.line : null
    const column = firstDetail ? firstDetail.column : null
    const endColumn = firstDetail ? firstDetail.endColumn : null

    throw createSyntaxError(message, {
      code: classifySyntaxCode(message),
      metadata: {
        errors: parser.errors,
        errorDetails: parser.errorDetails,
        line,
        column,
        endColumn,
        sourceLine: firstDetail ? firstDetail.sourceLine : null,
        suggestion: firstDetail ? firstDetail.suggestion : null,
      },
    })
  }

  return program
}

module.exports = { Parser, parse }
