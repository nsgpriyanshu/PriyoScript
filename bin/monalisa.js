#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { runFile } = require('../src/core/run')
const { startRepl } = require('../src/repl/repl')
const { build, info, error } = require('../src/utils/logger')
const { printPriyoError, getDocsLink } = require('../src/errors')
const { ErrorCodes } = require('../src/errors/codes')

const { version: VERSION } = require('../package.json')

const rawArgs = process.argv.slice(2)

function parseArgs(values) {
  const args = []
  const traceOptions = {
    enabled: false,
    format: 'text',
    filter: {},
  }

  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (value === '-trace') {
      traceOptions.enabled = true
      continue
    }
    if (value === '-trace-format') {
      traceOptions.enabled = true
      traceOptions.format = values[i + 1] || 'text'
      i++
      continue
    }
    if (value === '-trace-op') {
      traceOptions.enabled = true
      traceOptions.filter.opsInclude = String(values[i + 1] || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
      i++
      continue
    }
    if (value === '-trace-op-exclude') {
      traceOptions.enabled = true
      traceOptions.filter.opsExclude = String(values[i + 1] || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
      i++
      continue
    }
    if (value === '-trace-file') {
      traceOptions.enabled = true
      traceOptions.filter.fileContains = values[i + 1] || ''
      i++
      continue
    }
    if (value === '-trace-frame') {
      traceOptions.enabled = true
      traceOptions.filter.frameContains = values[i + 1] || ''
      i++
      continue
    }
    if (value === '-trace-stack-min') {
      traceOptions.enabled = true
      traceOptions.filter.minStackDepth = Number(values[i + 1])
      i++
      continue
    }
    if (value === '-trace-stack-max') {
      traceOptions.enabled = true
      traceOptions.filter.maxStackDepth = Number(values[i + 1])
      i++
      continue
    }
    args.push(value)
  }

  return { args, traceOptions }
}

function normalizeTraceFilter(filter) {
  const normalized = { ...filter }
  if (Array.isArray(normalized.opsInclude)) {
    normalized.opsInclude = new Set(normalized.opsInclude)
  }
  if (Array.isArray(normalized.opsExclude)) {
    normalized.opsExclude = new Set(normalized.opsExclude)
  }
  if (typeof normalized.minStackDepth !== 'number' || Number.isNaN(normalized.minStackDepth)) {
    delete normalized.minStackDepth
  }
  if (typeof normalized.maxStackDepth !== 'number' || Number.isNaN(normalized.maxStackDepth)) {
    delete normalized.maxStackDepth
  }
  return normalized
}

const { args, traceOptions } = parseArgs(rawArgs)
const arg = args[0]
const traceEnabled = traceOptions.enabled
const traceFilter = normalizeTraceFilter(traceOptions.filter)
const traceFormat = traceOptions.format === 'json' ? 'json' : 'text'
const debugSessionId = `monalisa-${Date.now()}`

const ERROR_CODE_HELP = {
  [ErrorCodes.SYNTAX.PARSE_FAILED]:
    'Generic syntax parsing failure. Check brackets, block boundaries, and statement shape.',
  [ErrorCodes.SYNTAX.ILLEGAL_TOKEN]:
    'Unexpected token/keyword. Check spelling and syntax around the shown location.',
  [ErrorCodes.SYNTAX.RESERVED_WORD]:
    'Reserved or blocked word used in source. Replace with PriyoScript vocabulary.',
  [ErrorCodes.COMPILE.COMPILE_FAILED]:
    'Compilation failed after parse stage. Usually indicates an unsupported compiler path.',
  [ErrorCodes.RUNTIME.RUNTIME_FAILED]:
    'Generic runtime failure. Check details line for the exact source problem.',
  [ErrorCodes.RUNTIME.UNDEFINED_VARIABLE]:
    'Variable used before declaration or used outside of scope.',
  [ErrorCodes.RUNTIME.CONST_REASSIGN]: 'Attempted to reassign `priyoPromise` (const).',
  [ErrorCodes.RUNTIME.DIVISION_BY_ZERO]: 'Division/modulo by zero is not allowed.',
  [ErrorCodes.RUNTIME.UNKNOWN_CLASS]: 'Class name was referenced but not declared.',
  [ErrorCodes.RUNTIME.UNKNOWN_CALLABLE]: 'Function/method reference was not found.',
  [ErrorCodes.RUNTIME.PROPERTY_ERROR]:
    'Invalid property read/write or missing property on object/class.',
  [ErrorCodes.RUNTIME.ARGUMENT_MISMATCH]:
    'Invalid number/type of arguments for function/method call.',
  [ErrorCodes.RUNTIME.INVALID_INPUT]:
    'Input did not match required format (for example number input).',
  [ErrorCodes.RUNTIME.UNKNOWN_PACKAGE]: 'Package name was not found in built-in package registry.',
  [ErrorCodes.RUNTIME.UNKNOWN_MODULE]:
    'Module path import failed. Check lisaaBring path and ensure module starts with lisaaBox.',
  [ErrorCodes.ENGINE.INTERNAL]:
    'Engine/internal error. Usually a runtime/compiler bug, not user code.',
}

function printGeneralHelp() {
  info(`
PriyoScript CLI

monalisa is the official PriyoScript runtime.
It executes .priyo files directly.

  Usage:
    monalisa <file.priyo>              Execute a PriyoScript file
    monalisa -repl                     Start interactive REPL
    monalisa -v | -version             Show CLI version
    monalisa -h | -help                Show general help
    monalisa -trace <file.priyo>       Execute a file with opcode trace logs
    monalisa -th | -trace-help         Show trace filtering options
    monalisa -s | -syntax              Show quick syntax help
    monalisa -e | -errors              List error codes and meanings
    monalisa -x | -explain <CODE>      Explain one specific error code
`)
}

function printTraceHelp() {
  info(`
PriyoScript Trace Options

Usage:
  monalisa -trace <file.priyo>

Filters:
  -trace-format json        Emit trace output as JSON lines
  -trace-op ADD,SUB         Trace only selected opcodes (comma-separated)
  -trace-op-exclude HALT    Exclude opcodes from trace
  -trace-file modules       Trace only matching file path substring
  -trace-frame <name>       Trace only matching frame name substring
  -trace-stack-min 2        Trace only when stack depth >= N
  -trace-stack-max 6        Trace only when stack depth <= N

Examples:
  monalisa -trace -trace-op CALL_METHOD,RETURN examples/basics/for-loop.priyo
  monalisa -trace -trace-op-exclude HALT examples/basics/for-loop.priyo
  monalisa -trace -trace-file modules examples/modules/module-import.priyo
  monalisa -trace -trace-format json -trace-frame "<main>" examples/basics/for-loop.priyo
`)
}

function printSyntaxHelp() {
  info(`
PriyoScript Quick Syntax

Entry:
  monalisa { ... }

Variables:
  priyoKeep x = 10
  priyoChange y = 20
  priyoPromise z = 30

Flow:
  prakritiIf (...) { ... } prakritiElse { ... }
  prakritiChoose (x) { prakritiCase ("A") { ... } prakritiOtherwise { ... } }
  prakritiAsLongAs (...) { ... }
  prakritiCount (...; ...; ...) { ... }

Functions / Classes:
  lisaaTask add(a, b) { priyoGiveBack a + b }
  lisaaFamily Student { lisaaTask init(name) { priyoSelf.name = name } }

Packages:
  lisaaBring math
  priyoTell(math.add(2, 3))

Modules:
  // in module.priyo
  lisaaBox { lisaaShare sum }
  // in app
  lisaaBring "./module.priyo"

Debug hook:
  priyoBreak("label")                Emits a breakpoint event (use with -trace)
`)
}

function printErrorHelpList() {
  info('PriyoScript Error Code Reference:\n')
  const codes = Object.keys(ERROR_CODE_HELP).sort()
  for (const code of codes) {
    info(`  ${code} - ${ERROR_CODE_HELP[code]}`)
    info(`           Docs: ${getDocsLink(code)}`)
  }
}

function printSingleErrorHelp(code) {
  const normalized = String(code || '')
    .trim()
    .toUpperCase()
  if (!normalized) {
    error('Please provide an error code. Example: monalisa -explain PRUN-102')
    process.exit(1)
  }

  const explanation = ERROR_CODE_HELP[normalized]
  if (!explanation) {
    error(`Unknown error code: ${normalized}`)
    info('FYI: Use `monalisa -errors` to list all available codes.')
    process.exit(1)
  }

  info(`${normalized} - ${explanation}`)
  info(`Docs: ${getDocsLink(normalized)}`)
}

/* -------------------------
   VERSION COMMAND
-------------------------- */
if (arg === '-v' || arg === '-version') {
  build(`PriyoScript v${VERSION}`)
  process.exit(0)
}

/* -------------------------
   HELP COMMANDS
-------------------------- */
if (arg === '-h' || arg === '-help') {
  printGeneralHelp()
  process.exit(0)
}

if (arg === '-s' || arg === '-syntax') {
  printSyntaxHelp()
  process.exit(0)
}

if (arg === '-trace-help' || arg === '-th') {
  printTraceHelp()
  process.exit(0)
}

if (arg === '-e' || arg === '-errors') {
  printErrorHelpList()
  process.exit(0)
}

if (arg === '-repl') {
  startRepl({
    logger: { build, info, error },
    trace: traceEnabled,
    traceFormat,
    traceFilter,
    debugSessionId: `repl-${Date.now()}`,
  }).catch(err => {
    printPriyoError(err, {
      mode: 'cli',
      logger: {
        error,
        info,
      },
    })
    process.exit(1)
  })
  process.on('SIGINT', () => process.exit(0))
  return
}

if (arg === '-x' || arg === '-explain') {
  printSingleErrorHelp(args[1])
  process.exit(0)
}

/* -------------------------
   FILE EXECUTION
-------------------------- */

if (!arg) {
  startRepl({
    logger: { build, info, error },
    trace: traceEnabled,
    traceFormat,
    traceFilter,
    debugSessionId: `repl-${Date.now()}`,
  }).catch(err => {
    printPriyoError(err, {
      mode: 'cli',
      logger: {
        error,
        info,
      },
    })
    process.exit(1)
  })
  process.on('SIGINT', () => process.exit(0))
  return
}

const fullPath = path.resolve(process.cwd(), arg)

if (!fs.existsSync(fullPath)) {
  error(`So Disrespectful - File not found: ${arg}`)
  info('FYI: Check the path and extension. Example: `monalisa your-filename.priyo`.')
  process.exit(1)
}

async function main() {
  try {
    await runFile(fullPath, {
      trace: traceEnabled,
      traceLogger: line => info(line),
      traceFormat,
      traceFilter,
      debugSessionId,
    })
  } catch (err) {
    printPriyoError(err, {
      mode: 'cli',
      logger: {
        error,
        info,
      },
    })
    process.exit(1)
  }
}

main()
