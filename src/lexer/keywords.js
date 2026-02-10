const { TokenType } = require('./token')

const KEYWORDS = {
  // Entry
  monalisa: TokenType.ENTRY,

  // IO
  priyoTell: TokenType.PRINT,
  priyoListen: TokenType.INPUT,

  // Math
  priyoAdd: TokenType.PLUS,
  priyoSub: TokenType.MINUS,
  priyoMul: TokenType.STAR,
  priyoDiv: TokenType.SLASH,
  priyoMod: TokenType.PERCENT,

  // Literals
  priyoTrue: TokenType.TRUE,
  priyoFalse: TokenType.FALSE,
  priyoEmpty: TokenType.NULL,

  // Variables
  priyoKeep: TokenType.VAR,
  priyoChange: TokenType.LET,
  priyoPromise: TokenType.CONST,

  // Object / meta
  priyoSelf: TokenType.THIS,
  priyoParent: TokenType.SUPER,
  priyoCreate: TokenType.NEW,
  priyoForget: TokenType.DELETE,
  priyoWhatIs: TokenType.TYPEOF,

  // Control flow
  prakritiIf: TokenType.IF,
  prakritiElseIf: TokenType.ELIF,
  prakritiElse: TokenType.ELSE,

  prakritiRepeat: TokenType.LOOP,
  prakritiCount: TokenType.FOR,
  prakritiAsLongAs: TokenType.WHILE,
  prakritiDo: TokenType.DO,

  prakritiStop: TokenType.BREAK,
  prakritiGoOn: TokenType.CONTINUE,

  prakritiTry: TokenType.TRY,
  prakritiCatch: TokenType.CATCH,
  prakritiAtEnd: TokenType.FINALLY,
  prakritiThrow: TokenType.THROW,

  // Functions & classes
  lisaaTask: TokenType.FUNCTION,
  lisaaFamily: TokenType.CLASS,
  lisaaInherit: TokenType.EXTENDS,
  lisaaStable: TokenType.STATIC,

  // Modules
  lisaaBring: TokenType.IMPORT,
  lisaaShare: TokenType.EXPORT,
  lisaaBox: TokenType.PACKAGE,
}

module.exports = {
  KEYWORDS,
}
