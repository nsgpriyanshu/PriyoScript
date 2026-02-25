const { humanizeError } = require('../utils/user-errors')

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
    details.push(`Source: ${metadata.sourceLine.trim()}`)
  }
  if (humanized.detail) details.push(`Details: ${humanized.detail}`)
  if (Array.isArray(metadata.stack) && metadata.stack.length > 0) {
    details.push(`Stack: ${metadata.stack[0]}`)
  }

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
