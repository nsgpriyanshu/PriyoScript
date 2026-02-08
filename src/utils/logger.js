const { logSuccess, logInfo, logWarn, logError } = require('nstypocolors')

module.exports = {
  success(message) {
    logSuccess(message)
  },

  info(message) {
    logInfo(message)
  },

  warn(message) {
    logWarn(message)
  },

  error(message) {
    logError(`Error: ${message}`)
  },

  output(message) {
    process.stdout.write(String(message) + '\n')
  },
}
