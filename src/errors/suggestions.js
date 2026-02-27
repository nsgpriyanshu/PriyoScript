const { KEYWORD_LEXEMES, TOKEN_TO_KEYWORDS } = require('../lexer/keywords')

function levenshtein(a, b) {
  const left = String(a || '')
  const right = String(b || '')

  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let i = 0; i < rows; i++) matrix[i][0] = i
  for (let j = 0; j < cols; j++) matrix[0][j] = j

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[left.length][right.length]
}

function findClosestKeyword(tokenLiteral, candidates = KEYWORD_LEXEMES) {
  const source = String(tokenLiteral || '').trim()
  if (!source) return null

  let best = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const keyword of candidates) {
    const distance = levenshtein(source, keyword)
    if (distance < bestDistance) {
      bestDistance = distance
      best = keyword
    }
  }

  if (!best) return null
  const threshold = Math.max(1, Math.floor(best.length * 0.35))
  if (bestDistance > threshold) return null
  return best
}

function suggestForExpectedToken(tokenLiteral, expectedTokenType) {
  const candidates = TOKEN_TO_KEYWORDS[expectedTokenType] || []
  if (candidates.length === 0) return null
  return findClosestKeyword(tokenLiteral, candidates)
}

module.exports = {
  findClosestKeyword,
  suggestForExpectedToken,
}
