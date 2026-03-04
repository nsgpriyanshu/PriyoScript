import { PLAYGROUND_LIMITS } from '@/playground/constants'
import type {
  PlaygroundUserError,
  PlaygroundLogLevel,
  PlaygroundOutputLine,
  PlaygroundRunResult,
  PrimitiveValue,
} from '@/playground/types'
import userErrorsModule from '../../src/utils/user-errors.js'

const rootHumanizeError = (userErrorsModule as { humanizeError?: (input: unknown) => unknown })
  .humanizeError

type TokenType = 'number' | 'string' | 'identifier' | 'operator' | 'paren'
interface Token {
  type: TokenType
  value: string
}

interface VariableSlot {
  value: PrimitiveValue
  kind: 'var' | 'let' | 'const'
}

class ExpressionParser {
  private readonly tokens: Token[]
  private index = 0
  private readonly env: Map<string, VariableSlot>

  constructor(tokens: Token[], env: Map<string, VariableSlot>) {
    this.tokens = tokens
    this.env = env
  }

  parse(): PrimitiveValue {
    const value = this.parseExpression()
    if (!this.isAtEnd()) {
      throw new Error(`Unexpected token '${this.peek()?.value || ''}' in expression.`)
    }
    return value
  }

  private parseExpression(): PrimitiveValue {
    let left = this.parseTerm()

    while (this.matchOperator('+') || this.matchOperator('-')) {
      const operator = this.previous().value
      const right = this.parseTerm()
      if (operator === '+') {
        if (typeof left === 'string' || typeof right === 'string') {
          left = `${valueToString(left)}${valueToString(right)}`
        } else if (typeof left === 'number' && typeof right === 'number') {
          left = left + right
        } else {
          throw new Error("Operator '+' supports number+number or string concatenation.")
        }
      } else {
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error("Operator '-' supports numbers only.")
        }
        left = left - right
      }
    }

    return left
  }

  private parseTerm(): PrimitiveValue {
    let left = this.parseUnary()
    while (this.matchOperator('*') || this.matchOperator('/')) {
      const operator = this.previous().value
      const right = this.parseUnary()
      if (typeof left !== 'number' || typeof right !== 'number') {
        throw new Error(`Operator '${operator}' supports numbers only.`)
      }
      if (operator === '*') {
        left = left * right
      } else {
        if (right === 0) {
          throw new Error('Division by zero is not allowed in playground mode.')
        }
        left = left / right
      }
    }
    return left
  }

  private parseUnary(): PrimitiveValue {
    if (this.matchOperator('-')) {
      const value = this.parseUnary()
      if (typeof value !== 'number') {
        throw new Error("Unary '-' supports numbers only.")
      }
      return -value
    }
    return this.parsePrimary()
  }

  private parsePrimary(): PrimitiveValue {
    const token = this.peek()
    if (!token) {
      throw new Error('Unexpected end of expression.')
    }

    if (token.type === 'number') {
      this.advance()
      return Number(token.value)
    }

    if (token.type === 'string') {
      this.advance()
      return decodeStringToken(token.value)
    }

    if (token.type === 'identifier') {
      this.advance()
      if (token.value === 'priyoTrue') return true
      if (token.value === 'priyoFalse') return false
      if (token.value === 'priyoNull') return null

      const slot = this.env.get(token.value)
      if (!slot) {
        throw new Error(`Unknown variable '${token.value}'.`)
      }
      return slot.value
    }

    if (token.type === 'paren' && token.value === '(') {
      this.advance()
      const value = this.parseExpression()
      const close = this.peek()
      if (!close || close.type !== 'paren' || close.value !== ')') {
        throw new Error("Missing ')' in expression.")
      }
      this.advance()
      return value
    }

    throw new Error(`Unexpected token '${token.value}' in expression.`)
  }

  private matchOperator(expected: string): boolean {
    const token = this.peek()
    if (!token || token.type !== 'operator' || token.value !== expected) return false
    this.advance()
    return true
  }

  private previous(): Token {
    return this.tokens[this.index - 1]
  }

  private peek(): Token | undefined {
    return this.tokens[this.index]
  }

  private advance(): Token {
    this.index++
    return this.tokens[this.index - 1]
  }

  private isAtEnd(): boolean {
    return this.index >= this.tokens.length
  }
}

function decodeStringToken(token: string): string {
  const quote = token[0]
  const raw = token.slice(1, -1)
  let value = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch !== '\\') {
      value += ch
      continue
    }
    const next = raw[i + 1]
    i++
    if (next === 'n') value += '\n'
    else if (next === 't') value += '\t'
    else if (next === '\\') value += '\\'
    else if (next === quote) value += quote
    else value += next || ''
  }
  return value
}

function tokenizeExpression(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (ch === '"' || ch === "'") {
      const start = i
      const quote = ch
      i++
      while (i < input.length) {
        const current = input[i]
        if (current === '\\') {
          i += 2
          continue
        }
        if (current === quote) {
          i++
          break
        }
        i++
      }
      if (i > input.length || input[i - 1] !== quote) {
        throw new Error('Unclosed string literal in expression.')
      }
      tokens.push({ type: 'string', value: input.slice(start, i) })
      continue
    }

    if (/[0-9]/.test(ch)) {
      const start = i
      i++
      while (i < input.length && /[0-9.]/.test(input[i])) i++
      tokens.push({ type: 'number', value: input.slice(start, i) })
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      const start = i
      i++
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) i++
      tokens.push({ type: 'identifier', value: input.slice(start, i) })
      continue
    }

    if (['+', '-', '*', '/'].includes(ch)) {
      tokens.push({ type: 'operator', value: ch })
      i++
      continue
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch })
      i++
      continue
    }

    throw new Error(`Unsupported character '${ch}' in expression.`)
  }
  return tokens
}

function valueToString(value: PrimitiveValue): string {
  if (value === null) return 'priyoNull'
  if (typeof value === 'boolean') return value ? 'priyoTrue' : 'priyoFalse'
  return String(value)
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

function extractMonalisaBody(source: string): string {
  const trimmed = source.trim()
  const match = /^monalisa\s*\{/.exec(trimmed)
  if (!match) {
    throw new Error("Program must start with 'monalisa { ... }' in playground mode.")
  }

  const firstBraceIndex = trimmed.indexOf('{')
  let depth = 0
  let inString: '"' | "'" | null = null
  let escaped = false
  let closeIndex = -1

  for (let i = firstBraceIndex; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === inString) inString = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = ch
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        closeIndex = i
        break
      }
    }
  }

  if (closeIndex === -1) {
    throw new Error("Missing closing '}' for monalisa block.")
  }

  const trailing = trimmed.slice(closeIndex + 1).trim()
  if (trailing.length > 0) {
    throw new Error("Only one top-level 'monalisa { ... }' block is allowed in playground mode.")
  }

  return trimmed.slice(firstBraceIndex + 1, closeIndex)
}

function splitStatements(body: string): string[] {
  const statements: string[] = []
  let current = ''
  let inString: '"' | "'" | null = null
  let escaped = false
  let parenDepth = 0

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]

    if (inString) {
      current += ch
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === inString) inString = null
      continue
    }

    if (ch === '"' || ch === "'") {
      inString = ch
      current += ch
      continue
    }

    if (ch === '(') {
      parenDepth++
      current += ch
      continue
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      current += ch
      continue
    }

    if ((ch === ';' || ch === '\n') && parenDepth === 0) {
      const s = current.trim()
      if (s) statements.push(s)
      current = ''
      continue
    }

    current += ch
  }

  const final = current.trim()
  if (final) statements.push(final)
  return statements
}

function evaluateExpression(input: string, env: Map<string, VariableSlot>): PrimitiveValue {
  const tokens = tokenizeExpression(input)
  const parser = new ExpressionParser(tokens, env)
  return parser.parse()
}

function parseTellLevel(raw?: string): PlaygroundLogLevel {
  if (!raw) return 'plain'
  const lower = raw.toLowerCase()
  if (lower === 'build') return 'build'
  if (lower === 'success') return 'success'
  if (lower === 'info') return 'info'
  if (lower === 'warn') return 'warn'
  if (lower === 'error') return 'error'
  return 'plain'
}

function assertSourceWithinLimits(source: string): void {
  if (source.length > PLAYGROUND_LIMITS.maxSourceChars) {
    throw new Error(
      `Playground supports small programs only. Limit is ${PLAYGROUND_LIMITS.maxSourceChars} characters.`,
    )
  }
}

function assertStatementSupported(statement: string): void {
  if (
    statement.startsWith('prakriti') ||
    statement.startsWith('lisaaTask') ||
    statement.startsWith('lisaaFamily') ||
    statement.startsWith('lisaaBring') ||
    statement.startsWith('priyoListen')
  ) {
    throw new Error(
      `Statement '${statement.split(/\s+/)[0]}' is not supported in browser playground mode.`,
    )
  }
}

function humanizePlaygroundError(message: string): PlaygroundUserError {
  const base = typeof rootHumanizeError === 'function' ? rootHumanizeError({ message }) : null
  const baseMessage =
    base && typeof base === 'object' && 'message' in base
      ? String((base as { message: string }).message)
      : message
  const baseTip =
    base && typeof base === 'object' && 'tip' in base
      ? String((base as { tip?: string }).tip || '')
      : ''

  const raw = message.toLowerCase()

  if (raw.includes('must start with') || raw.includes('missing closing')) {
    return {
      code: 'PPLAY-001',
      message: baseMessage,
      tip: baseTip || "Start with 'monalisa {' and end with a matching '}'.",
    }
  }

  if (raw.includes('too many statements') || raw.includes('supports small programs')) {
    return {
      code: 'PPLAY-002',
      message: baseMessage,
      tip: `Keep program under ${PLAYGROUND_LIMITS.maxSourceChars} chars and ${PLAYGROUND_LIMITS.maxStatements} statements.`,
    }
  }

  if (raw.includes('not supported in browser playground mode')) {
    return {
      code: 'PPLAY-003',
      message: baseMessage,
      tip: 'Use basic statements only: variable declarations, assignment, and priyoTell.',
    }
  }

  if (raw.includes('unknown variable') || raw.includes('not declared')) {
    return {
      code: 'PPLAY-004',
      message: baseMessage,
      tip: baseTip || 'Declare variable first with priyoKeep/priyoChange/priyoPromise.',
    }
  }

  if (raw.includes('cannot reassign')) {
    return {
      code: 'PPLAY-005',
      message: baseMessage,
      tip:
        baseTip ||
        'Use priyoChange for mutable values, or avoid reassigning priyoPromise variables.',
    }
  }

  if (raw.includes('division by zero')) {
    return {
      code: 'PPLAY-006',
      message: baseMessage,
      tip: baseTip || 'Ensure denominator is not zero before dividing.',
    }
  }

  if (raw.includes('unclosed string') || raw.includes('missing')) {
    return {
      code: 'PPLAY-007',
      message: baseMessage,
      tip: baseTip || 'Check quotes, parentheses, and expression structure.',
    }
  }

  return {
    code: 'PPLAY-999',
    message: baseMessage,
    tip: baseTip || 'Try simplifying the program and run again.',
  }
}

export function runPlaygroundSource(source: string): PlaygroundRunResult {
  const start = performance.now()
  const lines: PlaygroundOutputLine[] = []

  try {
    assertSourceWithinLimits(source)
    const cleaned = stripComments(source)
    const body = extractMonalisaBody(cleaned)
    const statements = splitStatements(body)

    if (statements.length > PLAYGROUND_LIMITS.maxStatements) {
      throw new Error(
        `Too many statements (${statements.length}). Limit is ${PLAYGROUND_LIMITS.maxStatements}.`,
      )
    }

    const env = new Map<string, VariableSlot>()

    for (const statement of statements) {
      assertStatementSupported(statement)

      const decl =
        /^(priyoKeep|priyoChange|priyoPromise)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(
          statement,
        )
      if (decl) {
        const [, keyword, name, expr] = decl
        const kind: VariableSlot['kind'] =
          keyword === 'priyoPromise' ? 'const' : keyword === 'priyoChange' ? 'let' : 'var'
        const value = evaluateExpression(expr, env)
        env.set(name, { kind, value })
        continue
      }

      const print = /^priyoTell(?:\.(Build|Success|Info|Warn|Error))?\s*\(([\s\S]*)\)$/.exec(
        statement,
      )
      if (print) {
        const [, level, expr] = print
        const value = evaluateExpression(expr.trim(), env)
        lines.push({
          level: parseTellLevel(level),
          text: valueToString(value),
        })
        if (lines.length > PLAYGROUND_LIMITS.maxOutputLines) {
          throw new Error(
            `Too much output. Limit is ${PLAYGROUND_LIMITS.maxOutputLines} lines in playground mode.`,
          )
        }
        continue
      }

      const assign = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(statement)
      if (assign) {
        const [, name, expr] = assign
        const slot = env.get(name)
        if (!slot) {
          throw new Error(`Cannot assign '${name}' because it is not declared.`)
        }
        if (slot.kind === 'const') {
          throw new Error(`Cannot reassign '${name}' because it was declared with priyoPromise.`)
        }
        slot.value = evaluateExpression(expr, env)
        env.set(name, slot)
        continue
      }

      throw new Error(`Unsupported statement in playground mode: '${statement}'`)
    }

    const end = performance.now()
    return {
      ok: true,
      lines,
      stats: {
        sourceChars: source.length,
        statements: statements.length,
        durationMs: Number((end - start).toFixed(2)),
      },
    }
  } catch (error) {
    const end = performance.now()
    const message = error instanceof Error ? error.message : 'Unknown playground error.'
    return {
      ok: false,
      lines,
      error: humanizePlaygroundError(message),
      stats: {
        sourceChars: source.length,
        statements: 0,
        durationMs: Number((end - start).toFixed(2)),
      },
    }
  }
}
