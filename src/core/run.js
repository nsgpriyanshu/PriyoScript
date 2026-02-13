const fs = require('fs')
const path = require('path')
const { parse } = require('../parser/parser')
const { Compiler } = require('../compiler/compiler')
const { VM } = require('../vm/vm')
const { build } = require('../utils/logger')

async function runSource(source, options = {}) {
  const { printBytecode = false } = options

  const ast = parse(source)
  const compiler = new Compiler()
  const bytecode = compiler.compile(ast)

  if (printBytecode) {
    build('Compilation Successful')
    console.log(bytecode)
  }

  const vm = new VM(bytecode)
  await vm.run()

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
