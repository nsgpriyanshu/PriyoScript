const readline = require('readline/promises')
const { stdin, stdout } = require('process')
const fs = require('fs')
const path = require('path')
const { runSource, runFile, createModuleRuntime } = require('../core/run')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')
const { printPriyoError } = require('../errors')
const { build, info } = require('../utils/logger')

function colorBuildPrompt(text) {
  const palette = [127, 163, 199, 200, 206, 212, 218, 225]
  if (!text) return text
  return text
    .split('')
    .map((char, i) => {
      const t = text.length === 1 ? 0 : i / (text.length - 1)
      const idx = Math.floor(t * (palette.length - 1))
      return `\x1b[38;5;${palette[idx]}m${char}\x1b[0m`
    })
    .join('')
}

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

function toExecutableSource(source) {
  const trimmed = String(source || '').trim()
  if (/^(monalisa|lisaaBox)\b/.test(trimmed)) {
    return trimmed
  }
  return wrapSnippet(trimmed)
}

function parseReplCommand(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('.')) return null
  const [command, ...rest] = trimmed.split(/\s+/)
  return {
    command,
    args: rest,
  }
}

async function startRepl(options = {}) {
  const traceEnabled = !!options.trace
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
    prompt: message => rl.question(message),
  })
  let moduleRuntime = createModuleRuntime({
    stdin: options.input || stdin,
    stdout: options.output || stdout,
  })

  const { version: VERSION } = require('../../package.json')

  logger.build(`Hey, this is PriyoScript REPL - v${VERSION}`)
  logger.info(`Type .help for commands, .exit to quit.${traceEnabled ? ' Trace mode is ON.' : ''}`)

  let buffer = ''

  try {
    while (true) {
      // To use default white/plain prompt instead, replace this with:
      // const prompt = buffer ? '... ' : 'priyo> '
      const prompt = buffer ? colorBuildPrompt('... ') : colorBuildPrompt('priyo> ')
      let line
      try {
        line = await rl.question(prompt)
      } catch (err) {
        // Gracefully stop when input stream closes (non-interactive harness/tests).
        if (err && /readline was closed/i.test(String(err.message || err))) {
          break
        }
        throw err
      }
      const trimmed = line.trim()

      if (!buffer && trimmed === '') continue

      if (!buffer) {
        const replCommand = parseReplCommand(line)
        if (replCommand) {
          if (replCommand.command === '.exit') break

          if (replCommand.command === '.help') {
            logger.info('REPL commands:')
            logger.info('  .help            Show this help')
            logger.info('  .clear           Clear current multiline buffer')
            logger.info('  .reset           Reset runtime state and module cache')
            logger.info('  .load <file>     Execute a .priyo file in current REPL context')
            logger.info('  .exit            Exit REPL')
            logger.info(
              '  Tip: Use `priyoBreak("label")` inside code for breakpoint-style trace hooks.',
            )
            continue
          }

          if (replCommand.command === '.clear') {
            buffer = ''
            logger.info('Buffer cleared.')
            continue
          }

          if (replCommand.command === '.reset') {
            environment = new Environment(null, { isFunctionScope: true })
            moduleRuntime = createModuleRuntime({
              stdin: options.input || stdin,
              stdout: options.output || stdout,
            })
            builtins = createBuiltins({
              stdin: options.input || stdin,
              stdout: options.output || stdout,
              console: console,
              prompt: message => rl.question(message),
            })
            logger.info('Runtime state reset.')
            continue
          }

          if (replCommand.command === '.load') {
            const target = replCommand.args.join(' ').trim()
            if (!target) {
              logger.error('Missing file path. Usage: .load <file.priyo>')
              continue
            }
            const absolutePath = path.resolve(process.cwd(), target)
            if (!fs.existsSync(absolutePath)) {
              logger.error(`File not found: ${target}`)
              continue
            }
            try {
              await runFile(absolutePath, {
                environment,
                builtins,
                moduleLoader: moduleRuntime.moduleLoader,
                moduleCache: moduleRuntime.moduleCache,
                trace: traceEnabled,
                traceLogger: line => (logger.info || console.log)(line),
              })
              logger.info(`Loaded: ${target}`)
            } catch (err) {
              printPriyoError(err, {
                mode: 'cli',
                logger: {
                  error: logger.error || console.error,
                  info: logger.info || console.log,
                },
              })
            }
            continue
          }

          logger.error(`Unknown REPL command: ${replCommand.command}`)
          logger.info('Use .help to see available commands.')
          continue
        }
      }

      buffer = buffer ? `${buffer}\n${line}` : line
      if (needsMoreInput(buffer)) continue

      const source = toExecutableSource(buffer)
      try {
        await runSource(source, {
          environment,
          builtins,
          moduleLoader: moduleRuntime.moduleLoader,
          moduleCache: moduleRuntime.moduleCache,
          trace: traceEnabled,
          traceLogger: line => (logger.info || console.log)(line),
        })
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
