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

function formatSourceContext(context, column, endColumn) {
  if (!Array.isArray(context) || context.length === 0) return []
  const width = String(context[context.length - 1].line || context.length).length
  const lines = []
  for (const entry of context) {
    const lineNo = String(entry.line).padStart(width, ' ')
    const marker = entry.isFocus ? '>' : ' '
    lines.push(`${marker} ${lineNo} | ${entry.text || ''}`)
    if (entry.isFocus) {
      const caret = renderCaretRange(entry.text || '', column, endColumn)
      if (caret) {
        lines.push(`  ${' '.repeat(width)} | ${caret}`)
      }
    }
  }
  return lines
}

function formatErrorForUser(err) {
  const humanized = humanizeError(err)
  const metadata = err.metadata || {}

  const details = []
  if (err.code) details.push(`Code: ${err.code}`)
  if (err.name) details.push(`Type: ${err.name}`)
  if (err.stage) details.push(`Stage: ${err.stage}`)
  if (err.category) details.push(`Category: ${err.category}`)
  if (metadata.phase) details.push(`Phase: ${metadata.phase}`)
  if (metadata.file || metadata.line || metadata.column) {
    const file = metadata.file || '<memory>'
    const line = metadata.line || '?'
    const column = metadata.column || '?'
    details.push(`Location: ${file}:${line}:${column}`)
  }
  if (Array.isArray(metadata.sourceContext) && metadata.sourceContext.length > 0) {
    const context = metadata.sourceContext.map(entry => ({
      ...entry,
      isFocus: entry.line === metadata.line,
    }))
    details.push('Context:')
    details.push(...formatSourceContext(context, metadata.column, metadata.endColumn))
  } else if (metadata.sourceLine) {
    details.push(`Source: ${metadata.sourceLine}`)
    const caretRange = renderCaretRange(metadata.sourceLine, metadata.column, metadata.endColumn)
    if (caretRange) {
      details.push(`Span:   ${caretRange}`)
    }
  }
  if (metadata.suggestion) {
    details.push(`Did you mean: ${metadata.suggestion}`)
  }
  if (Array.isArray(metadata.triedPaths) && metadata.triedPaths.length > 0) {
    details.push(`Tried paths: ${metadata.triedPaths.join(', ')}`)
  }
  if (metadata.importSource) {
    details.push(`Import source: ${metadata.importSource}`)
  }
  if (metadata.importerFile) {
    details.push(`Importer: ${metadata.importerFile}`)
  }
  if (humanized.detail) details.push(`Details: ${humanized.detail}`)
  if (Array.isArray(metadata.stack) && metadata.stack.length > 0) {
    details.push('Host Stack:')
    const slice = metadata.stack.slice(0, 3)
    for (const line of slice) {
      details.push(`  ${line}`)
    }
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
