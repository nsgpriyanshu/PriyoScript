const DOCS_BASE = 'https://priyoscript.vercel.app/docs/stable/reference/errors-reference'

function docsSlugFromCode(code) {
  return String(code || '')
    .trim()
    .toLowerCase()
}

function getDocsLink(code) {
  const slug = docsSlugFromCode(code)
  if (!slug) return DOCS_BASE
  return `${DOCS_BASE}#${slug}`
}

module.exports = {
  DOCS_BASE,
  getDocsLink,
}
