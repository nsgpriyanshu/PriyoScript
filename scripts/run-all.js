const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { info } = require('../src/utils/logger')

// Go one level up from /scripts to project root
const ROOT_DIR = path.join(__dirname, '..')

const EXAMPLES_DIR = path.join(ROOT_DIR, 'examples')
const ENTRY = path.join(ROOT_DIR, 'src', 'index.js')

function getAllPriyoFiles(dir) {
  let results = []

  const list = fs.readdirSync(dir)

  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      results = results.concat(getAllPriyoFiles(fullPath))
    } else if (file.endsWith('.priyo')) {
      results.push(fullPath)
    }
  }

  return results
}

function runAll() {
  const files = getAllPriyoFiles(EXAMPLES_DIR)

  console.log(`\nFound ${files.length} .priyo files\n`)

  for (const file of files) {
    info('============================================')
    info(`Running: ${path.relative(ROOT_DIR, file)}`)
    info('============================================\n')

    try {
      execSync(`node "${ENTRY}" "${file}"`, { stdio: 'inherit' })
    } catch {
      console.error(`\nError while running: ${file}\n`)
    }

    console.log('\n')
  }

  info('All files successfully executed.')
}

runAll()
