#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { runFile } = require('../src/core/run')
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

async function main() {
  try {
    await runFile(fullPath)
  } catch (err) {
    error(err.message)
    process.exit(1)
  }
}

main()
