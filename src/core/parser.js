const keywords = require('../config/keywords.json');

class Parser {
  parse(source) {
    const lines = source
      .split(/\r?\n/)
      .map(l => l.replace(/;$/, '').trim())
      .filter(Boolean);

    if (lines.length === 0) throw new Error('Priyo found an empty story');

    // Entry block: monalisa { ... }
    if (!lines[0].startsWith(`${keywords.entry}{`)) {
      throw new Error(`Priyo expected ${keywords.entry}{ to begin the story`);
    }

    if (!lines[lines.length - 1].endsWith('}')) {
      throw new Error('Priyo feels incomplete — missing closing }');
    }

    return lines.slice(1, -1).map((line, i) => ({
      line,
      number: i + 2
    }));
  }
}

module.exports = new Parser();
