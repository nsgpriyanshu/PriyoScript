const readline = require('readline/promises')
const { stdin, stdout } = require('process')
const fs = require('fs')
const path = require('path')
const keywordConfig = require('../config/keywords.json')
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

const REPL_COMMANDS = [
  '.help',
  '.clear',
  '.editor',
  '.run',
  '.cancel',
  '.reset',
  '.load',
  '.reload',
  '.history',
  '.save',
  '.env',
  '.type',
  '.exit',
]
const PATH_AWARE_COMMANDS = new Set(['.load', '.reload', '.save'])
const statementStartConcepts = [
  'entry',
  'package',
  'var',
  'let',
  'const',
  'if',
  'elif',
  'else',
  'switch',
  'case',
  'default',
  'for',
  'while',
  'break',
  'continue',
  'try',
  'catch',
  'finally',
  'throw',
  'return',
  'import',
  'export',
  'function',
  'class',
  'interface',
  'async',
]
const activeKeywordConfig = keywordConfig.implemented || keywordConfig
const statementStartLexemes = new Set(
  statementStartConcepts.map(concept => activeKeywordConfig[concept]).filter(Boolean),
)

function analyzeInputBalance(source) {
  let braces = 0
  let parens = 0
  let brackets = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inLineComment = false
  let inBlockComment = false
  let escapeNext = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    const next = i + 1 < source.length ? source[i + 1] : ''

    if (inLineComment) {
      if (char === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }

    if (inSingleQuote || inDoubleQuote) {
      if (escapeNext) {
        escapeNext = false
        continue
      }
      if (char === '\\') {
        escapeNext = true
        continue
      }
      if (inSingleQuote && char === "'") {
        inSingleQuote = false
        continue
      }
      if (inDoubleQuote && char === '"') {
        inDoubleQuote = false
        continue
      }
      continue
    }

    if (char === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }
    if (char === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }
    if (char === "'") {
      inSingleQuote = true
      continue
    }
    if (char === '"') {
      inDoubleQuote = true
      continue
    }
    if (char === '{') braces++
    else if (char === '}') braces--
    else if (char === '(') parens++
    else if (char === ')') parens--
    else if (char === '[') brackets++
    else if (char === ']') brackets--
  }

  return {
    braces,
    parens,
    brackets,
    inSingleQuote,
    inDoubleQuote,
    inBlockComment,
  }
}

function needsMoreInput(buffer) {
  const state = analyzeInputBalance(buffer)
  return (
    state.braces > 0 ||
    state.parens > 0 ||
    state.brackets > 0 ||
    state.inSingleQuote ||
    state.inDoubleQuote ||
    state.inBlockComment
  )
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

function collectEnvironmentBindings(environment) {
  const names = new Set()
  let scope = environment
  while (scope) {
    if (scope.bindings && typeof scope.bindings.keys === 'function') {
      for (const name of scope.bindings.keys()) names.add(name)
    }
    scope = scope.parent
  }
  return Array.from(names)
}

function collectEnvironmentBindingDetails(environment) {
  const details = new Map()
  let scope = environment
  while (scope) {
    if (scope.bindings && typeof scope.bindings.entries === 'function') {
      for (const [name, binding] of scope.bindings.entries()) {
        if (!details.has(name)) {
          details.set(name, binding)
        }
      }
    }
    scope = scope.parent
  }
  return Array.from(details.entries())
}

function getCompletionToken(line) {
  const match = /([A-Za-z_\.][A-Za-z0-9_\.]*)$/.exec(line)
  return match ? match[1] : ''
}

function makeCompleter(getCandidates) {
  function listPathSuggestions(commandToken, rawArgValue) {
    const argValue = String(rawArgValue || '')
    const normalizedArg = argValue.replace(/\\/g, '/')
    const baseDirFragment = normalizedArg.includes('/')
      ? normalizedArg.slice(0, normalizedArg.lastIndexOf('/') + 1)
      : ''
    const partialName = normalizedArg.slice(baseDirFragment.length)
    const targetDir = path.resolve(process.cwd(), baseDirFragment || '.')

    let entries
    try {
      entries = fs.readdirSync(targetDir, { withFileTypes: true })
    } catch {
      return []
    }

    const suggestions = []
    for (const entry of entries) {
      if (!entry.name.startsWith(partialName)) continue
      const relativePath = `${baseDirFragment}${entry.name}`
      if (entry.isDirectory()) {
        suggestions.push(`${relativePath}/`)
        continue
      }
      if (commandToken === '.save') {
        suggestions.push(relativePath)
        continue
      }
      if (entry.name.endsWith('.priyo')) {
        suggestions.push(relativePath)
      }
    }

    return suggestions.sort((left, right) => left.localeCompare(right))
  }

  return line => {
    const rawLine = String(line || '')
    const trimmedStart = rawLine.trimStart()
    if (trimmedStart.startsWith('.')) {
      const commandToken = trimmedStart.split(/\s+/)[0]
      const hits = REPL_COMMANDS.filter(command => command.startsWith(commandToken))
      if (hits.length !== 1 || hits[0] !== commandToken) {
        return [hits.length ? hits : REPL_COMMANDS, commandToken]
      }
      if (!PATH_AWARE_COMMANDS.has(commandToken)) {
        return [hits, commandToken]
      }

      const argValue = trimmedStart.slice(commandToken.length).trimStart()
      const pathSuggestions = listPathSuggestions(commandToken, argValue)
      return [pathSuggestions.length ? pathSuggestions : hits, argValue]
    }

    const token = getCompletionToken(rawLine)
    if (!token) return [getCandidates(), token]
    const hits = getCandidates().filter(candidate => candidate.startsWith(token))
    return [hits.length ? hits : getCandidates(), token]
  }
}

function looksLikeExpressionSnippet(source) {
  const trimmed = String(source || '')
    .trim()
    .replace(/;+\s*$/, '')
  if (!trimmed) return false
  if (/^(monalisa|lisaaBox)\b/.test(trimmed)) return false

  const firstToken = trimmed.split(/\s+/)[0]
  if (statementStartLexemes.has(firstToken)) return false

  // Treat direct assignment as statement, but keep equality checks as expressions.
  if (/(^|[^=!<>])=($|[^=])/.test(trimmed)) return false

  // Do not auto-echo print-style calls; they already produce user-visible output.
  if (/^priyoTell(?:\.[A-Za-z_][A-Za-z0-9_]*)?\s*\(/.test(trimmed)) return false

  return true
}

function toExpressionEchoSource(expressionSource) {
  const trimmed = String(expressionSource || '')
    .trim()
    .replace(/;+\s*$/, '')
  return wrapSnippet(`priyoTell(${trimmed})`)
}

function inferValueType(value) {
  if (value == null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (value && value.type === 'user_function')
    return value.isGenerator ? 'generator-function' : 'function'
  if (value && value.type === 'class') return 'class'
  if (value && value.type === 'instance')
    return `instance<${value.classRef && value.classRef.name ? value.classRef.name : 'unknown'}>`
  if (value && value.type === 'bound_method') return 'bound-method'
  if (value && value.type === 'bound_static_method') return 'bound-static-method'
  return typeof value
}

function previewValue(value) {
  if (value == null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `array(len=${value.length})`
  if (value && value.type === 'class') return `class ${value.name}`
  if (value && value.type === 'instance') {
    const className = value.classRef && value.classRef.name ? value.classRef.name : 'unknown'
    return `instance<${className}>`
  }
  if (value && value.type === 'user_function') {
    const kind = value.isGenerator ? 'generator' : 'function'
    return `${kind}(params=${value.params.length})`
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

function loadPersistedHistory(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, 'utf8').trim()
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(item => typeof item === 'string')
  } catch {
    return []
  }
}

function savePersistedHistory(filePath, entries) {
  if (!filePath) return
  try {
    fs.writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
  } catch {
    // Ignore persistence write failures in interactive mode.
  }
}

async function startRepl(options = {}) {
  const traceEnabled = !!options.trace
  const logger = options.logger || { build, info, error: console.error }
  const getCompletionCandidates = () => {
    const keywordLexemes = Object.values(activeKeywordConfig)
    const scopeNames = collectEnvironmentBindings(environment)
    return Array.from(new Set([...keywordLexemes, ...scopeNames, ...REPL_COMMANDS]))
  }
  const rl = readline.createInterface({
    input: options.input || stdin,
    output: options.output || stdout,
    completer: makeCompleter(getCompletionCandidates),
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
  let lastLoadedFile = null

  const historyFile = options.historyFile || path.resolve(process.cwd(), '.priyo_repl_history.json')

  const { version: VERSION } = require('../../package.json')

  logger.build(`Hey, this is PriyoScript REPL - v${VERSION}`)
  logger.info(`Type .help for commands, .exit to quit.${traceEnabled ? ' Trace mode is ON.' : ''}`)

  let buffer = ''
  const historyEntries = loadPersistedHistory(historyFile)
  let typeProbeCounter = 0
  let editorMode = false
  let editorLines = []

  const runSnippet = async source => {
    const executedSnippet = source.trim()
    const executableSource = looksLikeExpressionSnippet(source)
      ? toExpressionEchoSource(source)
      : toExecutableSource(source)

    try {
      await runSource(executableSource, {
        environment,
        builtins,
        moduleLoader: moduleRuntime.moduleLoader,
        moduleCache: moduleRuntime.moduleCache,
        trace: traceEnabled,
        traceLogger: line => (logger.info || console.log)(line),
      })
      if (executedSnippet) {
        historyEntries.push(executedSnippet)
      }
    } catch (err) {
      printPriyoError(err, {
        mode: 'cli',
        logger: {
          error: logger.error || console.error,
          info: logger.info || console.log,
        },
      })
    }
  }

  try {
    while (true) {
      // To use default white/plain prompt instead, replace this with:
      // const prompt = buffer ? '... ' : 'priyo> '
      const prompt = editorMode
        ? colorBuildPrompt('edit> ')
        : buffer
          ? colorBuildPrompt('... ')
          : colorBuildPrompt('priyo> ')
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

      if (editorMode) {
        if (trimmed === '.help') {
          logger.info('Editor mode commands:')
          logger.info('  .run             Execute editor buffer in current REPL context')
          logger.info('  .cancel          Discard editor buffer and exit editor mode')
          logger.info('  .help            Show editor commands')
          continue
        }

        if (trimmed === '.cancel') {
          editorLines = []
          editorMode = false
          logger.info('Editor buffer discarded.')
          continue
        }

        if (trimmed === '.run') {
          const editorSource = editorLines.join('\n').trim()
          if (!editorSource) {
            logger.info('Editor buffer is empty.')
            editorMode = false
            continue
          }
          await runSnippet(editorSource)
          editorLines = []
          editorMode = false
          continue
        }

        editorLines.push(line)
        continue
      }

      if (!buffer && trimmed === '') continue

      if (!buffer) {
        const replCommand = parseReplCommand(line)
        if (replCommand) {
          if (replCommand.command === '.exit') break

          if (replCommand.command === '.help') {
            logger.info('REPL commands:')
            logger.info('  .help            Show this help')
            logger.info('  .clear           Clear current multiline buffer')
            logger.info('  .editor          Enter editor mode for writing multi-line snippets')
            logger.info('  .reset           Reset runtime state and module cache')
            logger.info('  .load <file>     Execute a .priyo file in current REPL context')
            logger.info('  .reload [file]   Reload last loaded file (or explicit file)')
            logger.info('  .history         Show executed REPL snippets')
            logger.info('  .save <file>     Save executed snippets to a file')
            logger.info('  .env             List current bindings in REPL scope')
            logger.info('  .type <expr>     Evaluate expression and show type + preview')
            logger.info('  .exit            Exit REPL')
            continue
          }

          if (replCommand.command === '.clear') {
            buffer = ''
            logger.info('Buffer cleared.')
            continue
          }

          if (replCommand.command === '.editor') {
            editorMode = true
            editorLines = []
            logger.info(
              'Editor mode enabled. Type code, then .run to execute or .cancel to discard.',
            )
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
              lastLoadedFile = absolutePath
              historyEntries.push(`// loaded: ${target}`)
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

          if (replCommand.command === '.reload') {
            const targetArg = replCommand.args.join(' ').trim()
            const absolutePath = targetArg ? path.resolve(process.cwd(), targetArg) : lastLoadedFile
            if (!absolutePath) {
              logger.error('No previous file loaded. Usage: .reload <file.priyo>')
              continue
            }
            if (!fs.existsSync(absolutePath)) {
              logger.error(`File not found: ${targetArg || absolutePath}`)
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
              lastLoadedFile = absolutePath
              logger.info(`Reloaded: ${targetArg || path.relative(process.cwd(), absolutePath)}`)
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

          if (replCommand.command === '.history') {
            if (historyEntries.length === 0) {
              logger.info('No history entries yet.')
              continue
            }
            logger.info('REPL history:')
            for (let i = 0; i < historyEntries.length; i++) {
              logger.info(`  ${i + 1}. ${historyEntries[i]}`)
            }
            continue
          }

          if (replCommand.command === '.save') {
            const target = replCommand.args.join(' ').trim()
            if (!target) {
              logger.error('Missing file path. Usage: .save <file.priyo>')
              continue
            }
            const absolutePath = path.resolve(process.cwd(), target)
            const body = historyEntries.join('\n\n')
            fs.writeFileSync(absolutePath, `${body}\n`, 'utf8')
            logger.info(`Saved history to: ${target}`)
            continue
          }

          if (replCommand.command === '.env') {
            const entries = collectEnvironmentBindingDetails(environment)
              .filter(([name]) => !name.startsWith('__replType_'))
              .sort(([left], [right]) => left.localeCompare(right))
            if (entries.length === 0) {
              logger.info('No bindings available in current scope.')
              continue
            }
            logger.info('Bindings:')
            for (const [name, binding] of entries) {
              logger.info(
                `  ${name} [${binding.kind}] -> ${inferValueType(binding.value)} = ${previewValue(binding.value)}`,
              )
            }
            continue
          }

          if (replCommand.command === '.type') {
            const expression = replCommand.args.join(' ').trim()
            if (!expression) {
              logger.error('Missing expression. Usage: .type <expression>')
              continue
            }
            const probeName = `__replType_${Date.now()}_${++typeProbeCounter}`
            const probeSource = wrapSnippet(`priyoKeep ${probeName} = (${expression})`)
            const probeEnvironment = new Environment(environment, { isFunctionScope: true })
            try {
              await runSource(probeSource, {
                environment: probeEnvironment,
                builtins,
                moduleLoader: moduleRuntime.moduleLoader,
                moduleCache: moduleRuntime.moduleCache,
                trace: false,
              })
              const value = probeEnvironment.get(probeName)
              logger.info(`type: ${inferValueType(value)}`)
              logger.info(`value: ${previewValue(value)}`)
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

      await runSnippet(buffer)
      buffer = ''
    }
  } finally {
    savePersistedHistory(historyFile, historyEntries)
    rl.close()
  }
}

module.exports = { startRepl }
