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

class BlockStatement {
  constructor(statements) {
    this.type = 'BlockStatement'
    this.statements = statements
  }
}

class IfStatement {
  constructor(branches, alternate) {
    this.type = 'IfStatement'
    this.branches = branches
    this.alternate = alternate
  }
}

class WhileStatement {
  constructor(condition, body) {
    this.type = 'WhileStatement'
    this.condition = condition
    this.body = body
  }
}

class ForStatement {
  constructor(initializer, condition, update, body) {
    this.type = 'ForStatement'
    this.initializer = initializer
    this.condition = condition
    this.update = update
    this.body = body
  }
}

class BreakStatement {
  constructor() {
    this.type = 'BreakStatement'
  }
}

class ContinueStatement {
  constructor() {
    this.type = 'ContinueStatement'
  }
}

class FunctionDeclaration {
  constructor(name, params, body) {
    this.type = 'FunctionDeclaration'
    this.name = name
    this.params = params
    this.body = body
  }
}

class ReturnStatement {
  constructor(argument = null) {
    this.type = 'ReturnStatement'
    this.argument = argument
  }
}

class ClassDeclaration {
  constructor(name, methods, superClass = null) {
    this.type = 'ClassDeclaration'
    this.name = name
    this.methods = methods
    this.superClass = superClass
  }
}

class MethodDeclaration {
  constructor(name, params, body, isStatic = false) {
    this.type = 'MethodDeclaration'
    this.name = name
    this.params = params
    this.body = body
    this.isStatic = isStatic
  }
}

class BinaryExpression {
  constructor(left, operator, right) {
    this.type = 'BinaryExpression'
    this.left = left
    this.operator = operator
    this.right = right
  }
}

class UnaryExpression {
  constructor(operator, argument) {
    this.type = 'UnaryExpression'
    this.operator = operator
    this.argument = argument
  }
}

class ThisExpression {
  constructor() {
    this.type = 'ThisExpression'
  }
}

class SuperExpression {
  constructor() {
    this.type = 'SuperExpression'
  }
}

class MemberExpression {
  constructor(object, property) {
    this.type = 'MemberExpression'
    this.object = object
    this.property = property
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

class NewExpression {
  constructor(callee, args) {
    this.type = 'NewExpression'
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
  BlockStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  BreakStatement,
  ContinueStatement,
  FunctionDeclaration,
  ReturnStatement,
  ClassDeclaration,
  MethodDeclaration,
  BinaryExpression,
  UnaryExpression,
  ThisExpression,
  SuperExpression,
  MemberExpression,
  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  CallExpression,
  NewExpression,
}
