const TokenType = {
  // Special
  EOF: 'EOF',
  ILLEGAL: 'ILLEGAL',

  // Entry
  ENTRY: 'ENTRY',

  // Identifiers & literals
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',

  // Values
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  NULL: 'NULL',

  // Variables
  VAR: 'VAR',
  LET: 'LET',
  CONST: 'CONST',

  // IO
  PRINT: 'PRINT',
  INPUT: 'INPUT',

  // Operators
  ASSIGN: 'ASSIGN',
  BANG: 'BANG',
  AND: 'AND',
  OR: 'OR',
  EQ: 'EQ',
  NOT_EQ: 'NOT_EQ',
  LT: 'LT',
  LTE: 'LTE',
  GT: 'GT',
  GTE: 'GTE',
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  STAR: 'STAR',
  SLASH: 'SLASH',
  PERCENT: 'PERCENT',

  // Control flow
  IF: 'IF',
  ELIF: 'ELIF',
  ELSE: 'ELSE',
  SWITCH: 'SWITCH',
  CASE: 'CASE',
  DEFAULT: 'DEFAULT',
  FOR: 'FOR',
  WHILE: 'WHILE',
  DO: 'DO',
  LOOP: 'LOOP',
  BREAK: 'BREAK',
  CONTINUE: 'CONTINUE',
  RETURN: 'RETURN',
  TRY: 'TRY',
  CATCH: 'CATCH',
  FINALLY: 'FINALLY',
  THROW: 'THROW',
  DEBUGGER: 'DEBUGGER',
  ASYNC: 'ASYNC',
  AWAIT: 'AWAIT',
  YIELD: 'YIELD',

  // Functions / classes
  FUNCTION: 'FUNCTION',
  CLASS: 'CLASS',
  EXTENDS: 'EXTENDS',
  STATIC: 'STATIC',
  IMPLEMENTS: 'IMPLEMENTS',
  INTERFACE: 'INTERFACE',
  PRIVATE: 'PRIVATE',
  PROTECTED: 'PROTECTED',
  PUBLIC: 'PUBLIC',
  ENUM: 'ENUM',

  // Meta
  THIS: 'THIS',
  SUPER: 'SUPER',
  NEW: 'NEW',
  DELETE: 'DELETE',
  TYPEOF: 'TYPEOF',
  INSTANCEOF: 'INSTANCEOF',
  VOID: 'VOID',
  IN: 'IN',
  WITH: 'WITH',

  // Modules
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
  PACKAGE: 'PACKAGE',

  // Delimiters
  COMMA: 'COMMA',
  SEMICOLON: 'SEMICOLON',

  // Brackets
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
}

module.exports = { TokenType }
