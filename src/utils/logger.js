const { logSuccess, logInfo, logWarn, logError, logBuild } = require('nstypocolors');

module.exports = {
  success(msg) { logSuccess(msg); },
  info(msg) { logInfo(msg); },
  warn(msg) { logWarn(msg); },
  error(msg) { logError(`Error: ${msg}`); },
  output(msg, color = 'build') {
    if (color === 'build') {
      logBuild(msg);
    } else {
      process.stdout.write(String(msg) + '\n');
    }
  }
};
