#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { runFile } = require('../src/core/run')
const { error, info } = require('../src/utils/logger')
const { humanizeError } = require('../src/utils/user-errors')

const filename = process.argv[2]

if (!filename) {
  error('So Rude - Provide a PriyoScript file to run.')
  info('FYI: Use `monalisa your-filename.priyo`.')
  process.exit(1)
}

const fullPath = path.resolve(process.cwd(), filename)

if (!fs.existsSync(fullPath)) {
  error(`So Disrespectfull - File not found: ${filename}`)
  info('FYI: Check the path and extension. Example: `monalisa your-filename.priyo`.')
  process.exit(1)
}

async function main() {
  try {
    await runFile(fullPath)
  } catch (err) {
    const formatted = humanizeError(err.message)
    error(formatted.message)
    if (formatted.tip) {
      info(`Tip: ${formatted.tip}`)
    }
    if (formatted.detail) {
      info(`Details: ${formatted.detail}`)
    }
    process.exit(1)
  }
}

main()
