export const priyoscriptLanguage = {
  name: 'priyoscript',
  aliases: ['priyo'],
  scopeName: 'source.priyoscript',
  patterns: [
    { include: '#comments' },
    { include: '#strings' },
    { include: '#numbers' },
    { include: '#keywords' },
    { include: '#booleans' },
    { include: '#operators' },
    { include: '#functionDecl' },
  ],
  repository: {
    comments: {
      patterns: [
        { name: 'comment.line.double-slash.priyoscript', match: '//.*$' },
        {
          name: 'comment.block.priyoscript',
          begin: '/\\*',
          end: '\\*/',
        },
      ],
    },
    strings: {
      patterns: [
        {
          name: 'string.quoted.double.priyoscript',
          begin: '"',
          end: '"',
          patterns: [{ name: 'constant.character.escape.priyoscript', match: '\\\\.' }],
        },
        {
          name: 'string.quoted.single.priyoscript',
          begin: "'",
          end: "'",
          patterns: [{ name: 'constant.character.escape.priyoscript', match: '\\\\.' }],
        },
      ],
    },
    numbers: {
      patterns: [{ name: 'constant.numeric.priyoscript', match: '\\b\\d+(?:\\.\\d+)?\\b' }],
    },
    keywords: {
      patterns: [
        {
          name: 'keyword.control.priyoscript',
          match:
            '\\b(?:monalisa|lisaaBring|lisaaShare|lisaaBox|prakritiIf|prakritiElseIf|prakritiElse|prakritiChoose|prakritiCase|prakritiOtherwise|prakritiCount|prakritiAsLongAs|priyoInside|prakritiStop|prakritiGoOn|prakritiTry|prakritiCatch|prakritiAtEnd|prakritiThrow|lisaaInherit)\\b',
        },
        {
          name: 'storage.type.priyoscript',
          match:
            '\\b(?:priyoKeep|priyoChange|priyoPromise|priyoCreate|priyoGiveBack|lisaaTask|lisaaFamily|lisaaStable)\\b',
        },
        {
          name: 'constant.language.priyoscript',
          match: '\\b(?:priyoTrue|priyoFalse|priyoEmpty|priyoSelf|priyoParent)\\b',
        },
      ],
    },
    booleans: {
      patterns: [
        { name: 'constant.language.boolean.priyoscript', match: '\\b(?:priyoTrue|priyoFalse)\\b' },
      ],
    },
    operators: {
      patterns: [
        {
          name: 'keyword.operator.priyoscript',
          match: '===|!==|==|!=|<=|>=|&&|\\|\\||[+\\-*/%<>=!]',
        },
      ],
    },
    functionDecl: {
      patterns: [
        {
          name: 'entity.name.function.priyoscript',
          match: '\\b(?:lisaaTask)\\s+([A-Za-z_][A-Za-z0-9_]*)\\b',
          captures: {
            1: { name: 'entity.name.function.priyoscript' },
          },
        },
      ],
    },
  },
}
