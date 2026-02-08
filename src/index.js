const path = require('path');
const fs = require('fs');
const logger = require(path.join(__dirname, './utils/logger'));
const parser = require(path.join(__dirname, './core/parser'));
const interpreter = require(path.join(__dirname, './core/interpreter'));

function runPriyoScript(filePath) {
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
      logger.error('Priyo couldn’t find the file');
      process.exit(1);
    }

    const source = fs.readFileSync(absolutePath, 'utf-8');
    const program = parser.parse(source);
    interpreter.execute(program);

  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    logger.error('Priyo feels lonely — no .priyo file provided');
    process.exit(1);
  }
  runPriyoScript(filePath);
}

module.exports = runPriyoScript;
