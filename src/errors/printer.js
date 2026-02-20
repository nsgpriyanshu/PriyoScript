const { formatErrorForUser, formatErrorForDeveloper } = require('./formatter')

function printPriyoError(err, options = {}) {
  const mode = options.mode || 'cli'
  const logger = options.logger || {}
  const logError = logger.error || console.error
  const logInfo = logger.info || console.log

  if (mode === 'dev') {
    logError(formatErrorForDeveloper(err))
    return
  }

  const formatted = formatErrorForUser(err)
  logError(formatted.message)

  if (formatted.tip) {
    logInfo(`FYI (Tip): ${formatted.tip}`)
  }

  for (const line of formatted.details) {
    logInfo(line)
  }
}

module.exports = {
  printPriyoError,
}
