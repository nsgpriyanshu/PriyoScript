import { createHighlighter } from 'shiki'
import { priyoscriptLanguage } from '@/lib/shiki-priyoscript'

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function extractCodeInnerHtml(shikiHtml: string): string {
  const match = shikiHtml.match(/<code[^>]*>([\s\S]*?)<\/code>/)
  return match ? match[1] : escapeHtml(shikiHtml)
}

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [priyoscriptLanguage],
    })
  }
  return highlighterPromise
}

export async function highlightPriyoInBrowser(
  code: string,
): Promise<{ light: string; dark: string }> {
  const highlighter = await getHighlighter()
  const light = highlighter.codeToHtml(code, {
    lang: 'priyoscript',
    theme: 'github-light',
  })
  const dark = highlighter.codeToHtml(code, {
    lang: 'priyoscript',
    theme: 'github-dark',
  })

  return {
    light: extractCodeInnerHtml(light),
    dark: extractCodeInnerHtml(dark),
  }
}

export function fallbackHighlight(code: string): { light: string; dark: string } {
  const escaped = escapeHtml(code || ' ')
  return { light: escaped, dark: escaped }
}
