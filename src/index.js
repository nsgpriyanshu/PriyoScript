const { runFile } = require('./core/run')
const { printPriyoError } = require('./errors')

async function main() {
  const filename = process.argv[2]

  if (!filename) {
    throw new Error('Usage: node src/index.js <file.priyo>')
  }

  await runFile(filename, { printBytecode: true })
}

main().catch(err => {
  printPriyoError(err, { mode: 'dev' })
  process.exit(1)
})
