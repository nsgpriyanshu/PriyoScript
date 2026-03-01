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
  ErrorCodes,
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

function uniquePaths(paths) {
  const seen = new Set()
  const result = []
  for (const candidate of paths) {
    const normalized = path.normalize(candidate)
    if (!seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  }
  return result
}

function looksLikePathImport(source) {
  return (
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('/') ||
    source.includes('/') ||
    source.includes('\\') ||
    source.endsWith('.priyo') ||
    path.isAbsolute(source)
  )
}

function buildModuleCandidates(importSource, importerFile, projectRoot) {
  const source = String(importSource || '').trim()
  if (!source) {
    return {
      source,
      mode: 'invalid',
      candidates: [],
      isPathImport: true,
      errorReason: 'Empty module import source',
    }
  }

  if (!looksLikePathImport(source)) {
    return {
      source,
      mode: 'package',
      candidates: [],
      isPathImport: false,
      errorReason: null,
    }
  }

  const importerDir = importerFile ? path.dirname(importerFile) : process.cwd()
  let baseResolved
  let mode

  if (source.startsWith('./') || source.startsWith('../')) {
    mode = 'relative'
    baseResolved = path.resolve(importerDir, source)
  } else if (source.startsWith('/')) {
    // PriyoScript absolute imports are project-root relative (not OS-root relative).
    mode = 'project-absolute'
    baseResolved = path.resolve(projectRoot, `.${source}`)
  } else if (path.isAbsolute(source)) {
    mode = 'filesystem-absolute'
    baseResolved = path.normalize(source)
  } else {
    // Backward compatibility: "folder/module.priyo" or "module.priyo" without ./ prefix.
    mode = 'legacy-relative'
    baseResolved = path.resolve(importerDir, source)
  }

  const candidates = []
  const ext = path.extname(baseResolved)
  if (ext) {
    candidates.push(baseResolved)
  } else {
    candidates.push(baseResolved)
    candidates.push(`${baseResolved}.priyo`)
  }
  candidates.push(path.join(baseResolved, 'index.priyo'))

  return {
    source,
    mode,
    candidates: uniquePaths(candidates),
    isPathImport: true,
    errorReason: null,
  }
}

function resolveModulePath(importSource, importerFile, projectRoot = process.cwd()) {
  const resolution = buildModuleCandidates(importSource, importerFile, projectRoot)
  if (!resolution.isPathImport || resolution.errorReason) {
    return { modulePath: null, resolution }
  }

  const modulePath = resolution.candidates.find(candidate => {
    try {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    } catch {
      return false
    }
  })

  return { modulePath: modulePath || null, resolution }
}

function createModuleRuntime(io = {}) {
  const moduleCache = new Map()
  const loadingModules = new Set()
  const projectRoot = io.projectRoot || process.cwd()

  const moduleLoader = async (importSource, importerFile) => {
    const { modulePath, resolution } = resolveModulePath(importSource, importerFile, projectRoot)
    if (!resolution.isPathImport) {
      throw createRuntimeError(
        `Unknown module path import: "${importSource}". Path imports must use ./, ../, /, or an explicit .priyo path.`,
        {
          code: ErrorCodes.RUNTIME.UNKNOWN_MODULE,
          metadata: {
            importSource,
            importerFile: importerFile || null,
            resolutionMode: resolution.mode,
          },
        },
      )
    }

    if (!modulePath) {
      throw createRuntimeError(
        `Module not found: "${importSource}". Tried: ${resolution.candidates.join(', ')}`,
        {
          code: ErrorCodes.RUNTIME.UNKNOWN_MODULE,
          metadata: {
            importSource,
            importerFile: importerFile || null,
            resolutionMode: resolution.mode,
            triedPaths: resolution.candidates,
          },
        },
      )
    }

    if (loadingModules.has(modulePath)) {
      throw createRuntimeError(
        `Cyclic module import detected for "${importSource}" at "${modulePath}"`,
        {
          code: ErrorCodes.RUNTIME.UNKNOWN_MODULE,
          metadata: {
            importSource,
            importerFile: importerFile || null,
            resolvedPath: modulePath,
          },
        },
      )
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
    trace = false,
    traceLogger = null,
    debugHooks = null,
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

  let vm = null
  try {
    vm = new VM(bytecode, {
      environment,
      builtins,
      moduleLoader,
      currentFile: filename,
      moduleContext: activeModuleContext,
      trace,
      traceLogger,
      debugHooks,
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
    const sourceStack = vm && typeof vm.getSourceStack === 'function' ? vm.getSourceStack() : []
    const runtimeErr = createRuntimeError(err.message, {
      code: classification.code,
      category: classification.category,
      metadata: {
        phase: 'vm',
        file: filename,
        stack: cleanStack(err.stack),
        sourceStack,
        ...fallback,
      },
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
