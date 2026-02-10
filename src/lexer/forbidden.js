const FORBIDDEN_WORDS = new Set([
  // JavaScript
  'let',
  'const',
  'var',
  'function',
  'return',
  'if',
  'else',
  'switch',
  'case',
  'break',
  'continue',
  'true',
  'false',
  'null',
  'class',
  'extends',
  'new',
  'this',
  'super',

  // Python
  'def',
  'elif',
  'None',
  'True',
  'False',

  // Common
  'while',
  'for',
  'do',
  'try',
  'catch',
  'finally',
])

module.exports = { FORBIDDEN_WORDS }
