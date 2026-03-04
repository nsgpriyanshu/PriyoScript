'use client'

import { useEffect, useState } from 'react'
import { fallbackHighlight, highlightPriyoInBrowser } from '@/playground/highlight'

interface EditorPanelProps {
  value: string
  onChange: (value: string) => void
  maxChars: number
}

export function EditorPanel({ value, onChange, maxChars }: EditorPanelProps) {
  const count = value.length
  const overLimit = count > maxChars
  const [highlighted, setHighlighted] = useState(() => fallbackHighlight(value))

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      highlightPriyoInBrowser(value)
        .then(result => {
          if (!mounted) return
          setHighlighted(result)
        })
        .catch(() => {
          if (!mounted) return
          setHighlighted(fallbackHighlight(value))
        })
    }, 120)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [value])

  return (
    <section className="rounded-2xl border border-fd-border bg-fd-card/70 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-fd-foreground">Editor</h2>
        <span
          className={`text-xs font-medium ${
            overLimit ? 'text-rose-500' : 'text-fd-muted-foreground'
          }`}
        >
          {count}/{maxChars}
        </span>
      </div>

      <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-fd-border bg-fd-background">
        <pre
          className="pointer-events-none absolute inset-0 overflow-auto p-3 font-mono text-sm leading-6 text-fd-foreground [&_.line]:leading-[inherit] [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0"
          aria-hidden
        >
          <code
            className="block dark:hidden"
            dangerouslySetInnerHTML={{ __html: highlighted.light || ' ' }}
          />
          <code
            className="hidden dark:block"
            dangerouslySetInnerHTML={{ __html: highlighted.dark || ' ' }}
          />
        </pre>
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          spellCheck={false}
          className="absolute inset-0 resize-none overflow-auto bg-transparent p-3 font-mono text-sm leading-6 text-transparent caret-fd-foreground outline-none ring-0"
        />
      </div>
    </section>
  )
}
