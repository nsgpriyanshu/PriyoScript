import { describe, it, expect } from 'vitest'
import lexerModule from '../src/lexer/lexer.js'
import tokenModule from '../src/lexer/token.js'
const { Lexer } = lexerModule
const { TokenType } = tokenModule

describe('Lexer', () => {
    it('should tokenize basic operators', () => {
        const input = '=+(){},;'
        const tests = [
            { type: TokenType.ASSIGN, literal: '=' },
            { type: TokenType.PLUS, literal: '+' },
            { type: TokenType.LPAREN, literal: '(' },
            { type: TokenType.RPAREN, literal: ')' },
            { type: TokenType.LBRACE, literal: '{' },
            { type: TokenType.RBRACE, literal: '}' },
            { type: TokenType.COMMA, literal: ',' },
            { type: TokenType.SEMICOLON, literal: ';' },
            { type: TokenType.EOF, literal: '' }
        ]

        const lexer = new Lexer(input)
        for (const tt of tests) {
            const tok = lexer.nextToken()
            expect(tok.type).toBe(tt.type)
            expect(tok.literal).toBe(tt.literal)
        }
    })

    it('should tokenize numbers', () => {
        const input = '123 45.67'
        const lexer = new Lexer(input)

        let tok = lexer.nextToken()
        expect(tok.type).toBe(TokenType.NUMBER)
        expect(tok.literal).toBe('123')

        tok = lexer.nextToken()
        expect(tok.type).toBe(TokenType.NUMBER)
        expect(tok.literal).toBe('45') // '.' is dot token if not handled in numbers? wait, priyoscript lexer doesn't parse floats natively in one token?

        tok = lexer.nextToken()
        expect(tok.type).toBe(TokenType.DOT)
        expect(tok.literal).toBe('.')

        tok = lexer.nextToken()
        expect(tok.type).toBe(TokenType.NUMBER)
        expect(tok.literal).toBe('67')
    })

    it('should tokenize strings', () => {
        const input = '"hello world"'
        const lexer = new Lexer(input)

        const tok = lexer.nextToken()
        expect(tok.type).toBe(TokenType.STRING)
        expect(tok.literal).toBe('hello world')
    })

    it('should skip comments', () => {
        const input = `
      // line comment
      let x = 10
      /* 
         block comment 
      */
      +
    `
        const lexer = new Lexer(input)
        // we expect 'let' (or IDENTIFIER if not defined as keyword in this test), x, =, 10, +
        // wait, we just skip comments. Let's just tokenize till '+'
        const toks = []
        while (true) {
            const tok = lexer.nextToken()
            if (tok.type === TokenType.EOF) break
            toks.push(tok.literal)
        }
        expect(toks).toEqual(['let', 'x', '=', '10', '+'])
    })
})
