class Program {
  constructor(entry) {
    this.type = 'Program'
    this.entry = entry
  }
}

class EntryBlock {
  constructor(body) {
    this.type = 'EntryBlock'
    this.body = body
  }
}
class ExpressionStatement {
  constructor(expression) {
    this.type = 'ExpressionStatement'
    this.expression = expression
  }
}

module.exports = {
  Program,
  EntryBlock,
  ExpressionStatement,
}
