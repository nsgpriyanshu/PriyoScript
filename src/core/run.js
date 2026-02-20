const fs = require('fs')
const path = require('path')
const { parse } = require('../parser/parser')
const { Compiler } = require('../compiler/compiler')
const { VM } = require('../vm/vm')
const { build } = require('../utils/logger')
const {
  isPriyoError,
  createCompileError,
  createEngineError,
  createRuntimeError,
  classifyRuntimeFailure,
  ErrorStage,
} = require('../errors')

async function runSource(source, options = {}) {
  const { printBytecode = false } = options
  let ast
  try {
    ast = parse(source)
  } catch (err) {
    if (isPriyoError(err)) throw err
    throw createEngineError(err.message, {
      stage: ErrorStage.SYNTAX,
      metadata: { phase: 'parse' },
      cause: err,
    })
  }

  let bytecode
  try {
    const compiler = new Compiler()
    bytecode = compiler.compile(ast)
  } catch (err) {
    if (isPriyoError(err)) throw err
    throw createCompileError(err.message, {
      metadata: { phase: 'compile' },
      cause: err,
    })
  }

  if (printBytecode) {
    build('Compilation Successful')
    console.log(bytecode)
  }

  try {
    const vm = new VM(bytecode)
    await vm.run()
  } catch (err) {
    if (isPriyoError(err)) throw err

    const classification = classifyRuntimeFailure(err.message || String(err))
    if (classification.category === 'engine') {
      throw createEngineError(err.message, {
        stage: ErrorStage.RUNTIME,
        metadata: { phase: 'vm' },
        cause: err,
      })
    }

    throw createRuntimeError(err.message, {
      code: classification.code,
      category: classification.category,
      metadata: { phase: 'vm' },
      cause: err,
    })
  }

  return { ast, bytecode }
}

async function runFile(filename, options = {}) {
  const fullPath = path.resolve(process.cwd(), filename)
  const source = fs.readFileSync(fullPath, 'utf8')
  return runSource(source, options)
}

module.exports = {
  runSource,
  runFile,
}
