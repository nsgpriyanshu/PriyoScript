const path = require('path')
const fs = require('fs')
const logger = require('../utils/logger')

module.exports = (() => {
  const filePath = process.argv[2]

  if (!filePath) {
    logger.error('Priyo feels lonely — no .priyo file provided')
    process.exit(1)
  }

  if (path.extname(filePath) !== '.priyo') {
    logger.error('Priyo only understands .priyo files')
    process.exit(1)
  }

  const absolutePath = path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    logger.error('Priyo searched everywhere but couldn’t find the file')
    process.exit(1)
  }

  require('../index')(absolutePath)
})()
