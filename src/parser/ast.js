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

class VariableDeclaration {
  constructor(kind, identifier, initializer) {
    this.type = 'VariableDeclaration'
    this.kind = kind
    this.identifier = identifier
    this.initializer = initializer
  }
}

class AssignmentStatement {
  constructor(identifier, value) {
    this.type = 'AssignmentStatement'
    this.identifier = identifier
    this.value = value
  }
}

class Identifier {
  constructor(name) {
    this.type = 'Identifier'
    this.name = name
  }
}

class StringLiteral {
  constructor(value) {
    this.type = 'StringLiteral'
    this.value = value
  }
}

class NumberLiteral {
  constructor(value) {
    this.type = 'NumberLiteral'
    this.value = value
  }
}

class BooleanLiteral {
  constructor(value) {
    this.type = 'BooleanLiteral'
    this.value = value
  }
}

class NullLiteral {
  constructor() {
    this.type = 'NullLiteral'
    this.value = null
  }
}

class CallExpression {
  constructor(callee, args) {
    this.type = 'CallExpression'
    this.callee = callee
    this.arguments = args
  }
}

module.exports = {
  Program,
  EntryBlock,
  ExpressionStatement,
  VariableDeclaration,
  AssignmentStatement,
  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  CallExpression,
}
