const fs = require('fs')
const parser = require('./core/parser')
const interpreter = require('./core/interpreter')
const logger = require('./utils/logger')

function runPriyoScript(filePath) {
  try {
    const source = fs.readFileSync(filePath, 'utf-8')
    const parsedProgram = parser.parse(source)
    interpreter.execute(parsedProgram)
  } catch (err) {
    logger.error(err.message)
    process.exit(1)
  }
}

/**
 * If this file is executed directly:
 *   node src/index.js examples/main.priyo
 */
if (require.main === module) {
  const filePath = process.argv[2]

  if (!filePath) {
    logger.error('Priyo feels lonely — no .priyo file provided')
    process.exit(1)
  }

  runPriyoScript(filePath)
}

module.exports = runPriyoScript
