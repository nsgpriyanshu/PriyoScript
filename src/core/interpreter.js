const Runtime = require('./runtime')
const keywords = require('../config/keywords.json')
const logger = require('../utils/logger')

class Interpreter {
  constructor() {
    this.runtime = new Runtime()
  }

  execute(program) {
    if (program.length === 0) {
      throw new Error('Priyo found nothing to execute')
    }

    for (const instruction of program) {
      try {
        this.evaluate(instruction)
      } catch (err) {
        throw new Error(`${err.message} at line ${instruction.number}`)
      }
    }
  }

  evaluate({ line }) {
    // PRINT
    if (line.includes(keywords.print)) {
      let content = line.replace(keywords.print, '').trim()

      // remove parentheses
      if (content.startsWith('(') && content.endsWith(')')) {
        content = content.slice(1, -1).trim()
      }

      // string literal
      if (
        (content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith("'") && content.endsWith("'"))
      ) {
        logger.info(content.slice(1, -1))
        return
      }

      // variable
      logger.info(this.runtime.get(content))
      return
    }

    // ASSIGNMENT
    if (line.includes('=')) {
      const [name, value] = line.split('=').map(s => s.trim())

      if (!name) {
        throw new Error('Priyo forgot the variable name')
      }

      const numericValue = Number(value)
      if (Number.isNaN(numericValue)) {
        throw new Error(`Priyo can’t understand value "${value}"`)
      }

      this.runtime.set(name, numericValue)
      return
    }

    throw new Error('Priyo got confused reading this line')
  }
}

module.exports = new Interpreter()
