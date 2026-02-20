const { humanizeError } = require('../utils/user-errors')

function formatErrorForUser(err) {
  const humanized = humanizeError(err)

  const details = []
  if (err.code) details.push(`Code: ${err.code}`)
  if (err.stage) details.push(`Stage: ${err.stage}`)
  if (humanized.detail) details.push(`Details: ${humanized.detail}`)

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
  return `[${code}] [${stage}] ${message}`
}

module.exports = {
  formatErrorForUser,
  formatErrorForDeveloper,
}
