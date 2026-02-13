const { runFile } = require('./core/run')

async function main() {
  const filename = process.argv[2]

  if (!filename) {
    throw new Error('Usage: node src/index.js <file.priyo>')
  }

  await runFile(filename, { printBytecode: true })
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
