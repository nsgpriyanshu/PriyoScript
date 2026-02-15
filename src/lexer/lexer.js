const { TokenType } = require('./token')
const { KEYWORDS } = require('./keywords')
const { FORBIDDEN_WORDS } = require('./forbidden')

class Lexer {
  constructor(input) {
    this.input = input
    this.position = 0
    this.readPosition = 0
    this.ch = ''
    this.line = 1
    this.column = 0

    this.readChar()
  }

  peekChar() {
    if (this.readPosition >= this.input.length) {
      return '\0'
    }
    return this.input[this.readPosition]
  }

  readChar() {
    if (this.readPosition >= this.input.length) {
      this.ch = '\0'
    } else {
      this.ch = this.input[this.readPosition]
    }

    this.position = this.readPosition
    this.readPosition++

    if (this.ch === '\n') {
      this.line++
      this.column = 0
    } else {
      this.column++
    }
  }

  skipWhitespace() {
    while (this.ch === ' ' || this.ch === '\t' || this.ch === '\n' || this.ch === '\r') {
      this.readChar()
    }
  }

  skipLineComment() {
    while (this.ch !== '\n' && this.ch !== '\0') {
      this.readChar()
    }
  }

  skipBlockComment() {
    // Current cursor is on '/' and next char is '*'
    this.readChar() // move to '*'
    this.readChar() // move to first char inside comment

    while (this.ch !== '\0') {
      if (this.ch === '*' && this.peekChar() === '/') {
        this.readChar() // consume '*'
        this.readChar() // consume '/'
        return true
      }
      this.readChar()
    }

    return false
  }

  readIdentifier() {
    const start = this.position
    while (/[a-zA-Z0-9_]/.test(this.ch)) {
      this.readChar()
    }
    return this.input.slice(start, this.position)
  }

  readNumber() {
    const start = this.position
    while (/[0-9]/.test(this.ch)) {
      this.readChar()
    }
    return this.input.slice(start, this.position)
  }

  readString() {
    this.readChar() // skip opening quote
    const start = this.position

    while (this.ch !== '"' && this.ch !== '\0') {
      this.readChar()
    }

    const value = this.input.slice(start, this.position)
    this.readChar() // skip closing quote
    return value
  }

  nextToken() {
    while (true) {
      this.skipWhitespace()
      if (this.ch === '/' && this.peekChar() === '/') {
        this.skipLineComment()
        continue
      }
      if (this.ch === '/' && this.peekChar() === '*') {
        const startLine = this.line
        const startColumn = this.column
        const isClosed = this.skipBlockComment()

        if (!isClosed) {
          return {
            type: TokenType.ILLEGAL,
            literal: '/*',
            line: startLine,
            column: startColumn,
            message: 'Block comment was started with /* but never closed with */.',
          }
        }

        continue
      }
      break
    }

    const token = {
      type: TokenType.ILLEGAL,
      literal: '',
      line: this.line,
      column: this.column,
    }

    switch (this.ch) {
      case '=':
        if (this.peekChar() === '=') {
          this.readChar()
          token.type = TokenType.EQ
          token.literal = '=='
        } else {
          token.type = TokenType.ASSIGN
          token.literal = '='
        }
        break
      case '!':
        if (this.peekChar() === '=') {
          this.readChar()
          token.type = TokenType.NOT_EQ
          token.literal = '!='
        } else {
          token.type = TokenType.BANG
          token.literal = '!'
        }
        break
      case '&':
        if (this.peekChar() === '&') {
          this.readChar()
          token.type = TokenType.AND
          token.literal = '&&'
        } else {
          token.type = TokenType.ILLEGAL
          token.literal = '&'
        }
        break
      case '|':
        if (this.peekChar() === '|') {
          this.readChar()
          token.type = TokenType.OR
          token.literal = '||'
        } else {
          token.type = TokenType.ILLEGAL
          token.literal = '|'
        }
        break
      case '<':
        if (this.peekChar() === '=') {
          this.readChar()
          token.type = TokenType.LTE
          token.literal = '<='
        } else {
          token.type = TokenType.LT
          token.literal = '<'
        }
        break
      case '>':
        if (this.peekChar() === '=') {
          this.readChar()
          token.type = TokenType.GTE
          token.literal = '>='
        } else {
          token.type = TokenType.GT
          token.literal = '>'
        }
        break
      case '+':
        token.type = TokenType.PLUS
        token.literal = '+'
        break
      case '-':
        token.type = TokenType.MINUS
        token.literal = '-'
        break
      case '*':
        token.type = TokenType.STAR
        token.literal = '*'
        break
      case '/':
        token.type = TokenType.SLASH
        token.literal = '/'
        break
      case '%':
        token.type = TokenType.PERCENT
        token.literal = '%'
        break
      case '(':
        token.type = TokenType.LPAREN
        token.literal = '('
        break
      case ')':
        token.type = TokenType.RPAREN
        token.literal = ')'
        break
      case '{':
        token.type = TokenType.LBRACE
        token.literal = '{'
        break
      case '}':
        token.type = TokenType.RBRACE
        token.literal = '}'
        break
      case ',':
        token.type = TokenType.COMMA
        token.literal = ','
        break
      case ';':
        token.type = TokenType.SEMICOLON
        token.literal = ';'
        break
      case '.':
        token.type = TokenType.DOT
        token.literal = '.'
        break
      case '"':
        token.type = TokenType.STRING
        token.literal = this.readString()
        return token
      case '\0':
        token.type = TokenType.EOF
        token.literal = ''
        return token
      default:
        // Identifier or keyword
        if (/[a-zA-Z_]/.test(this.ch)) {
          const literal = this.readIdentifier()

          if (FORBIDDEN_WORDS.has(literal)) {
            return {
              type: TokenType.ILLEGAL,
              literal,
              line: this.line,
              column: this.column,
              message: `Reserved word "${literal}" is not allowed. Use Monalisa keywords.`,
            }
          }

          return {
            type: KEYWORDS[literal] || TokenType.IDENTIFIER,
            literal,
            line: this.line,
            column: this.column,
          }
        }

        // Number
        if (/[0-9]/.test(this.ch)) {
          return {
            type: TokenType.NUMBER,
            literal: this.readNumber(),
            line: this.line,
            column: this.column,
          }
        }

        token.literal = this.ch
    }

    this.readChar()
    return token
  }
}

module.exports = { Lexer }
