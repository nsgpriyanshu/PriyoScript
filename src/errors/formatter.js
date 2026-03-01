const { humanizeError } = require('../utils/user-errors')
const { getDocsLink } = require('./docs')

function renderCaretRange(sourceLine, column, endColumn) {
  if (!sourceLine || !Number.isInteger(column) || column < 1) return null
  const normalizedEnd = Number.isInteger(endColumn) && endColumn >= column ? endColumn : column
  const pointerStart = Math.max(1, column)
  const pointerWidth = Math.max(1, normalizedEnd - pointerStart + 1)
  const padding = ' '.repeat(pointerStart - 1)
  const carets = '^'.repeat(pointerWidth)
  return `${padding}${carets}`
}

function formatErrorForUser(err) {
  const humanized = humanizeError(err)
  const metadata = err.metadata || {}

  const details = []
  if (err.code) details.push(`Code: ${err.code}`)
  if (err.stage) details.push(`Stage: ${err.stage}`)
  if (metadata.file || metadata.line || metadata.column) {
    const file = metadata.file || '<memory>'
    const line = metadata.line || '?'
    const column = metadata.column || '?'
    details.push(`Location: ${file}:${line}:${column}`)
  }
  if (metadata.sourceLine) {
    details.push(`Source: ${metadata.sourceLine}`)
  }
  const caretRange = renderCaretRange(metadata.sourceLine, metadata.column, metadata.endColumn)
  if (caretRange) {
    details.push(`Span:   ${caretRange}`)
  }
  if (metadata.suggestion) {
    details.push(`Did you mean: ${metadata.suggestion}`)
  }
  if (humanized.detail) details.push(`Details: ${humanized.detail}`)
  if (Array.isArray(metadata.stack) && metadata.stack.length > 0) {
    details.push(`Stack: ${metadata.stack[0]}`)
  }
  if (Array.isArray(metadata.sourceStack) && metadata.sourceStack.length > 0) {
    details.push(`Priyo Stack: ${metadata.sourceStack[0]}`)
    for (let i = 1; i < metadata.sourceStack.length; i++) {
      details.push(`             ${metadata.sourceStack[i]}`)
    }
  }
  details.push(`Docs: ${getDocsLink(err.code)}`)

  return {
    message: humanized.message,
    tip: humanized.tip || null,
    details,
  }
}

function formatErrorForDeveloper(err) {
  const code = err && err.code ? err.code : 'UNKNOWN'
  const stage = err && err.stage ? err.stage : 'core'
  const message = err && err.message ? err.message : String(err)
  const metadata = (err && err.metadata) || {}
  const location =
    metadata.file || metadata.line || metadata.column
      ? ` @ ${metadata.file || '<memory>'}:${metadata.line || '?'}:${metadata.column || '?'}`
      : ''
  return `[${code}] [${stage}] ${message}${location}`
}

module.exports = {
  formatErrorForUser,
  formatErrorForDeveloper,
}
