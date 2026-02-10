const fs = require('fs')
const { parse } = require('./parser/parser')
const { Compiler } = require('./compiler/compiler')
const { VM } = require('./vm/vm')

const source = fs.readFileSync(process.argv[2], 'utf8')

const ast = parse(source)
const compiler = new Compiler()
const bytecode = compiler.compile(ast)

console.log('Compilation successful')
console.log(bytecode)

const vm = new VM(bytecode)
vm.run()
