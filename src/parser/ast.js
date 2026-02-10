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
  constructor(token) {
    this.type = 'ExpressionStatement'
    this.token = token
  }
}

module.exports = {
  Program,
  EntryBlock,
  ExpressionStatement,
}
