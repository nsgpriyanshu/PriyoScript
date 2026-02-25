const readline = require('readline/promises')
const { stdin, stdout } = require('process')
const { runSource } = require('../core/run')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')
const { printPriyoError } = require('../errors')
const { build, info } = require('../utils/logger')

function countOccurrences(value, char) {
  let count = 0
  for (const ch of value) {
    if (ch === char) count++
  }
  return count
}

function needsMoreInput(buffer) {
  const openBraces = countOccurrences(buffer, '{')
  const closeBraces = countOccurrences(buffer, '}')
  const openParens = countOccurrences(buffer, '(')
  const closeParens = countOccurrences(buffer, ')')
  const openBrackets = countOccurrences(buffer, '[')
  const closeBrackets = countOccurrences(buffer, ']')

  return openBraces > closeBraces || openParens > closeParens || openBrackets > closeBrackets
}

function wrapSnippet(source) {
  return `monalisa {\n${source}\n}`
}

async function startRepl(options = {}) {
  const logger = options.logger || { build, info, error: console.error }
  const rl = readline.createInterface({
    input: options.input || stdin,
    output: options.output || stdout,
  })

  let environment = new Environment(null, { isFunctionScope: true })
  let builtins = createBuiltins({
    stdin: options.input || stdin,
    stdout: options.output || stdout,
    console: console,
  })

  logger.build('PriyoScript REPL')
  logger.info('Type .help for commands, .exit to quit.')

  let buffer = ''

  try {
    while (true) {
      const prompt = buffer ? '... ' : 'priyo> '
      const line = await rl.question(prompt)
      const trimmed = line.trim()

      if (!buffer && trimmed === '') continue
      if (!buffer && trimmed === '.exit') break

      if (!buffer && trimmed === '.help') {
        logger.info('REPL commands:')
        logger.info('  .help   Show this help')
        logger.info('  .clear  Clear current multiline buffer')
        logger.info('  .reset  Reset runtime state (variables/functions/classes)')
        logger.info('  .exit   Exit REPL')
        continue
      }

      if (!buffer && trimmed === '.clear') {
        buffer = ''
        logger.info('Buffer cleared.')
        continue
      }

      if (!buffer && trimmed === '.reset') {
        environment = new Environment(null, { isFunctionScope: true })
        builtins = createBuiltins({
          stdin: options.input || stdin,
          stdout: options.output || stdout,
          console: console,
        })
        logger.info('Runtime state reset.')
        continue
      }

      buffer = buffer ? `${buffer}\n${line}` : line
      if (needsMoreInput(buffer)) continue

      const source = wrapSnippet(buffer)
      try {
        await runSource(source, { environment, builtins })
      } catch (err) {
        printPriyoError(err, {
          mode: 'cli',
          logger: {
            error: logger.error || console.error,
            info: logger.info || console.log,
          },
        })
      } finally {
        buffer = ''
      }
    }
  } finally {
    rl.close()
  }
}

module.exports = { startRepl }
