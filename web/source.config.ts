import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveKeywordsPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'src/config/keywords.json'),
    path.resolve(process.cwd(), '../src/config/keywords.json'),
    path.resolve(__dirname, '../../src/config/keywords.json'),
    path.resolve(__dirname, '../src/config/keywords.json'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  throw new Error(
    'Unable to locate root src/config/keywords.json for PriyoScript syntax highlighting config.',
  )
}

const keywordsPath = resolveKeywordsPath()

const keywordsConfig = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'))
const implementedKeywords = keywordsConfig?.implemented || {}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function keywordRegex(words: string[]): string {
  if (!words.length) return '\\b\\B'
  return `\\b(?:${words.map(escapeRegex).join('|')})\\b`
}

function pickKeywords(keys: string[]): string[] {
  return keys
    .map(key => implementedKeywords[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
}

const controlKeywords = pickKeywords([
  'entry',
  'import',
  'export',
  'package',
  'if',
  'elif',
  'else',
  'switch',
  'case',
  'default',
  'for',
  'while',
  'in',
  'break',
  'continue',
  'try',
  'catch',
  'finally',
  'throw',
  'extends',
])

const storageKeywords = pickKeywords([
  'var',
  'let',
  'const',
  'new',
  'return',
  'function',
  'class',
  'static',
])
const literalKeywords = pickKeywords(['true', 'false', 'null', 'this', 'super'])

const priyoscriptLanguage = {
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
          match: keywordRegex(controlKeywords),
        },
        {
          name: 'storage.type.priyoscript',
          match: keywordRegex(storageKeywords),
        },
        {
          name: 'constant.language.priyoscript',
          match: keywordRegex(literalKeywords),
        },
      ],
    },
    booleans: {
      patterns: [
        {
          name: 'constant.language.boolean.priyoscript',
          match: keywordRegex(pickKeywords(['true', 'false'])),
        },
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

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      langs: [priyoscriptLanguage],
    },
  },
})
