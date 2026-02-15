#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { runFile } = require('../src/core/run')
const { build, info, error } = require('../src/utils/logger')
const { humanizeError } = require('../src/utils/user-errors')

const { version: VERSION } = require('../package.json')

const arg = process.argv[2]

/* -------------------------
   VERSION COMMAND
-------------------------- */
if (arg === '-v' || arg === '-version') {
  build(`PriyoScript v${VERSION}`)
  process.exit(0)
}

/* -------------------------
   HELP COMMAND
-------------------------- */
if (arg === '-h' || arg === '-help') {
  info(`
PriyoScript CLI

monalisa is the official PriyoScript runtime.
It executes .priyo files directly — just like node runs .js files.

Usage:
  monalisa <file.priyo>      Execute a PriyoScript file
  monalisa -v | -version     Show CLI version
  monalisa -h | -help        Show help information
`)
  process.exit(0)
}

/* -------------------------
   FILE EXECUTION
-------------------------- */

if (!arg) {
  error('So Rude - Provide a PriyoScript file to run.')
  info('FYI: Use `monalisa your-filename.priyo`.')
  process.exit(1)
}

const fullPath = path.resolve(process.cwd(), arg)

if (!fs.existsSync(fullPath)) {
  error(`So Disrespectful - File not found: ${arg}`)
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
      info(`FYI (Tip): ${formatted.tip}`)
    }

    if (formatted.detail) {
      info(`Details: ${formatted.detail}`)
    }

    process.exit(1)
  }
}

main()
