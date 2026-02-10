#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { parse } = require('../src/parser/parser')
const { Compiler } = require('../src/compiler/compiler')
const { VM } = require('../src/vm/vm')
const { error, warn } = require('../src/utils/logger')

const filename = process.argv[2]

if (!filename) {
  warn('So Rude: The correct compilation command is monalisa <file.priyo>')
  process.exit(1)
}

const fullPath = path.resolve(process.cwd(), filename)

if (!fs.existsSync(fullPath)) {
  error(`So Disrespectfull: priyo couldn't find ${filename}`)
  process.exit(1)
}

const source = fs.readFileSync(fullPath, 'utf8')

try {
  const ast = parse(source)
  const compiler = new Compiler()
  const bytecode = compiler.compile(ast)

  const vm = new VM(bytecode)
  vm.run()
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
