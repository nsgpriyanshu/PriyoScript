const fs = require('fs')
const path = require('path')
const { parse } = require('../parser/parser')
const { Compiler } = require('../compiler/compiler')
const { VM } = require('../vm/vm')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')
const { build } = require('../utils/logger')
const {
  isPriyoError,
  createCompileError,
  createEngineError,
  createRuntimeError,
  classifyRuntimeFailure,
  ErrorStage,
} = require('../errors')

function extractSourceLine(source, lineNumber) {
  if (!lineNumber || lineNumber < 1) return null
  const lines = String(source || '').split('\n')
  return lines[lineNumber - 1] || null
}

function firstMeaningfulLocation(source) {
  const lines = String(source || '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const firstNonSpace = line.search(/\S/)
    if (firstNonSpace >= 0) {
      return {
        line: i + 1,
        column: firstNonSpace + 1,
        endColumn: firstNonSpace + 1,
      }
    }
  }
  return {
    line: 1,
    column: 1,
    endColumn: 1,
  }
}

function extractLocationFromMessage(message) {
  const text = String(message || '')
  const match = /line\s+(\d+),\s*column\s+(\d+)/i.exec(text)
  if (!match) return null
  return {
    line: Number(match[1]),
    column: Number(match[2]),
  }
}

function cleanStack(stack) {
  if (!stack) return []
  return String(stack)
    .split('\n')
    .map(line => line.trim())
    .filter(
      line =>
        line &&
        !line.includes('node:internal') &&
        !line.includes('internal/process') &&
        !line.includes('Module._compile'),
    )
    .slice(0, 8)
}

function attachSourceContext(err, { source, filename } = {}) {
  if (!isPriyoError(err)) return err
  err.metadata = err.metadata || {}

  if (filename) {
    err.metadata.file = filename
  }

  if ((!err.metadata.line || !err.metadata.column) && err.message) {
    const extracted = extractLocationFromMessage(err.message)
    if (extracted) {
      err.metadata.line = err.metadata.line || extracted.line
      err.metadata.column = err.metadata.column || extracted.column
    }
  }

  if (err.metadata.line && !err.metadata.sourceLine) {
    err.metadata.sourceLine = extractSourceLine(source, err.metadata.line)
  }

  if (err.cause && err.cause.stack && !err.metadata.stack) {
    err.metadata.stack = cleanStack(err.cause.stack)
  }

  return err
}

function resolveModulePath(importSource, importerFile) {
  const source = String(importSource || '').trim()
  const looksLikePath =
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('/') ||
    source.includes('\\') ||
    source.includes('/') ||
    source.endsWith('.priyo')

  if (!looksLikePath) return null

  const baseDir = importerFile ? path.dirname(importerFile) : process.cwd()
  const resolved = path.resolve(baseDir, source)
  if (path.extname(resolved)) return resolved
  return `${resolved}.priyo`
}

function createModuleRuntime(io = {}) {
  const moduleCache = new Map()
  const loadingModules = new Set()

  const moduleLoader = async (importSource, importerFile) => {
    const modulePath = resolveModulePath(importSource, importerFile)
    if (!modulePath) {
      throw new Error(`Unknown module path import: "${importSource}"`)
    }

    if (!fs.existsSync(modulePath)) {
      throw new Error(`Module file not found: "${importSource}"`)
    }

    if (loadingModules.has(modulePath)) {
      throw new Error(`Cyclic module import detected for "${importSource}"`)
    }

    if (moduleCache.has(modulePath)) {
      return moduleCache.get(modulePath)
    }

    loadingModules.add(modulePath)
    const moduleExports = { __priyoHostObject: true }
    moduleCache.set(modulePath, moduleExports)

    try {
      const moduleSource = fs.readFileSync(modulePath, 'utf8')
      await runSource(moduleSource, {
        filename: modulePath,
        expectModule: true,
        moduleContext: { exports: moduleExports },
        moduleLoader,
        moduleCache,
        environment: new Environment(null, { isFunctionScope: true }),
        builtins: createBuiltins(io),
        io,
      })
      return moduleExports
    } finally {
      loadingModules.delete(modulePath)
    }
  }

  return {
    moduleCache,
    moduleLoader,
    clearModuleCache() {
      moduleCache.clear()
      loadingModules.clear()
    },
  }
}

async function runSource(source, options = {}) {
  const {
    printBytecode = false,
    environment = new Environment(null, { isFunctionScope: true }),
    builtins = createBuiltins(options.io),
    filename = null,
    moduleLoader = null,
    moduleContext = null,
    expectModule = false,
  } = options
  let ast
  try {
    ast = parse(source)
    if (expectModule && ast.kind !== 'package') {
      throw createCompileError('Imported modules must start with lisaaBox { ... }', {
        metadata: {
          file: filename,
        },
      })
    }
  } catch (err) {
    if (isPriyoError(err)) throw attachSourceContext(err, { source, filename })
    throw createEngineError(err.message, {
      stage: ErrorStage.SYNTAX,
      metadata: { phase: 'parse', file: filename },
      cause: err,
    })
  }

  let bytecode
  try {
    const compiler = new Compiler()
    bytecode = compiler.compile(ast)
  } catch (err) {
    if (isPriyoError(err)) throw attachSourceContext(err, { source, filename })
    const fallback = firstMeaningfulLocation(source)
    const compileErr = createCompileError(err.message, {
      metadata: { phase: 'compile', file: filename, ...fallback },
      cause: err,
    })
    throw attachSourceContext(compileErr, { source, filename })
  }

  if (printBytecode) {
    build('Compilation Successful')
    console.log(bytecode)
  }

  const activeModuleContext =
    moduleContext || (ast.kind === 'package' ? { exports: { __priyoHostObject: true } } : null)

  try {
    const vm = new VM(bytecode, {
      environment,
      builtins,
      moduleLoader,
      currentFile: filename,
      moduleContext: activeModuleContext,
    })
    await vm.run()
  } catch (err) {
    if (isPriyoError(err)) throw attachSourceContext(err, { source, filename })

    const classification = classifyRuntimeFailure(err.message || String(err))
    if (classification.category === 'engine') {
      throw createEngineError(err.message, {
        stage: ErrorStage.RUNTIME,
        metadata: { phase: 'vm', file: filename, stack: cleanStack(err.stack) },
        cause: err,
      })
    }

    const fallback = firstMeaningfulLocation(source)
    const runtimeErr = createRuntimeError(err.message, {
      code: classification.code,
      category: classification.category,
      metadata: { phase: 'vm', file: filename, stack: cleanStack(err.stack), ...fallback },
      cause: err,
    })
    throw attachSourceContext(runtimeErr, { source, filename })
  }

  return { ast, bytecode, exports: activeModuleContext ? activeModuleContext.exports : null }
}

async function runFile(filename, options = {}) {
  const fullPath = path.resolve(process.cwd(), filename)
  const source = fs.readFileSync(fullPath, 'utf8')
  const moduleRuntime = options.moduleRuntime || createModuleRuntime(options.io)
  const moduleLoader = options.moduleLoader || moduleRuntime.moduleLoader

  return runSource(source, {
    ...options,
    filename: fullPath,
    moduleLoader,
    moduleCache: moduleRuntime.moduleCache,
  })
}

module.exports = {
  runSource,
  runFile,
  createModuleRuntime,
}
