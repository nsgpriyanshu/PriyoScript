const keywords = require('../config/keywords.json')

class Parser {
  parse(source) {
    const lines = source
      .split(/\r?\n/)
      .map(l => l.trim())
      .map(l => l.replace(/;$/, ''))
      .filter(l => l.length > 0)

    if (lines.length === 0) {
      throw new Error('Priyo found an empty story')
    }

    if (!lines[0].startsWith(`${keywords.entry}{`)) {
      throw new Error('Priyo expected monalisa { to begin the story')
    }

    if (!lines[lines.length - 1].endsWith('}')) {
      throw new Error('Priyo feels incomplete — missing closing }')
    }

    return lines.slice(1, -1).map((line, index) => ({
      line,
      number: index + 2,
    }))
  }
}

module.exports = new Parser()
