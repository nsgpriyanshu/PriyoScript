const { TokenType } = require('./token')
const keywordConfig = require('../config/keywords.json')

const CONCEPT_TO_TOKEN = {
  entry: TokenType.ENTRY,

  print: TokenType.PRINT,
  input: TokenType.INPUT,

  add: TokenType.PLUS,
  sub: TokenType.MINUS,
  mul: TokenType.STAR,
  div: TokenType.SLASH,
  mod: TokenType.PERCENT,

  true: TokenType.TRUE,
  false: TokenType.FALSE,
  null: TokenType.NULL,
  this: TokenType.THIS,
  super: TokenType.SUPER,

  var: TokenType.VAR,
  let: TokenType.LET,
  const: TokenType.CONST,

  new: TokenType.NEW,
  delete: TokenType.DELETE,
  typeof: TokenType.TYPEOF,
  instanceof: TokenType.INSTANCEOF,
  void: TokenType.VOID,
  return: TokenType.RETURN,

  if: TokenType.IF,
  elif: TokenType.ELIF,
  else: TokenType.ELSE,

  switch: TokenType.SWITCH,
  case: TokenType.CASE,
  default: TokenType.DEFAULT,

  loop: TokenType.LOOP,
  for: TokenType.FOR,
  while: TokenType.WHILE,
  do: TokenType.DO,

  break: TokenType.BREAK,
  continue: TokenType.CONTINUE,

  try: TokenType.TRY,
  catch: TokenType.CATCH,
  finally: TokenType.FINALLY,
  throw: TokenType.THROW,
  debugger: TokenType.DEBUGGER,

  function: TokenType.FUNCTION,
  class: TokenType.CLASS,
  extends: TokenType.EXTENDS,
  static: TokenType.STATIC,

  import: TokenType.IMPORT,
  export: TokenType.EXPORT,
  package: TokenType.PACKAGE,

  async: TokenType.ASYNC,
  await: TokenType.AWAIT,
  yield: TokenType.YIELD,

  in: TokenType.IN,
  with: TokenType.WITH,

  implements: TokenType.IMPLEMENTS,
  interface: TokenType.INTERFACE,
  private: TokenType.PRIVATE,
  protected: TokenType.PROTECTED,
  public: TokenType.PUBLIC,
  enum: TokenType.ENUM,
}

const KEYWORDS = Object.entries(keywordConfig).reduce((acc, [concept, lexeme]) => {
  const tokenType = CONCEPT_TO_TOKEN[concept]
  if (tokenType) {
    acc[lexeme] = tokenType
  }
  return acc
}, {})

module.exports = {
  KEYWORDS,
}
