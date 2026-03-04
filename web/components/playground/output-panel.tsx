'use client'

import type { PlaygroundOutputLine, PlaygroundUserError } from '@/playground/types'

interface OutputPanelProps {
  lines: PlaygroundOutputLine[]
  error?: PlaygroundUserError
}

function levelClass(level: PlaygroundOutputLine['level']) {
  if (level === 'build') return 'text-fuchsia-500 dark:text-fuchsia-300'
  if (level === 'success') return 'text-emerald-500 dark:text-emerald-300'
  if (level === 'info') return 'text-sky-500 dark:text-sky-300'
  if (level === 'warn') return 'text-amber-500 dark:text-amber-300'
  if (level === 'error') return 'text-rose-500 dark:text-rose-300'
  return 'text-fd-foreground'
}

export function OutputPanel({ lines, error }: OutputPanelProps) {
  return (
    <section className="rounded-2xl border border-fd-border bg-fd-card/70 p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-fd-foreground">Output</h2>

      <div className="min-h-[360px] rounded-xl border border-fd-border bg-fd-background p-3 font-mono text-sm leading-6">
        {lines.length === 0 && !error ? (
          <p className="text-fd-muted-foreground">Run program to see output.</p>
        ) : null}

        {lines.map((line, index) => (
          <p key={`${line.level}-${index}`} className={levelClass(line.level)}>
            {line.text}
          </p>
        ))}

        {error ? (
          <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3">
            <p className="text-rose-500 dark:text-rose-300">
              [{error.code}] {error.message}
            </p>
            {error.tip ? (
              <p className="mt-1 text-sky-500 dark:text-sky-300">Tip: {error.tip}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
