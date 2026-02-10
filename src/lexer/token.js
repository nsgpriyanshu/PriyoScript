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
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  STAR: 'STAR',
  SLASH: 'SLASH',
  PERCENT: 'PERCENT',

  // Control flow
  IF: 'IF',
  ELIF: 'ELIF',
  ELSE: 'ELSE',
  FOR: 'FOR',
  WHILE: 'WHILE',
  DO: 'DO',
  LOOP: 'LOOP',
  BREAK: 'BREAK',
  CONTINUE: 'CONTINUE',
  RETURN: 'RETURN',

  // Functions / classes
  FUNCTION: 'FUNCTION',
  CLASS: 'CLASS',
  EXTENDS: 'EXTENDS',
  STATIC: 'STATIC',

  // Meta
  THIS: 'THIS',
  SUPER: 'SUPER',
  NEW: 'NEW',
  DELETE: 'DELETE',
  TYPEOF: 'TYPEOF',

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
