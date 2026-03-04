'use client'

import { useMemo, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { PLAYGROUND_LIMITS } from '@/playground/constants'
import { runPlaygroundSource } from '@/playground/runner'
import { PLAYGROUND_SAMPLE } from '@/playground/samples'
import type { PlaygroundRunResult } from '@/playground/types'
import { EditorPanel } from '@/components/playground/editor-panel'
import { OutputPanel } from '@/components/playground/output-panel'

const EMPTY_RESULT: PlaygroundRunResult = {
  ok: true,
  lines: [],
  stats: {
    sourceChars: PLAYGROUND_SAMPLE.length,
    statements: 0,
    durationMs: 0,
  },
}

export function PlaygroundShell() {
  const [source, setSource] = useState(PLAYGROUND_SAMPLE)
  const [result, setResult] = useState<PlaygroundRunResult>(EMPTY_RESULT)

  const sourceTooLarge = source.length > PLAYGROUND_LIMITS.maxSourceChars

  const statsLabel = useMemo(() => {
    if (result.stats.durationMs <= 0) return 'Ready'
    return `${result.stats.durationMs} ms`
  }, [result.stats.durationMs])

  const handleRun = () => {
    setResult(runPlaygroundSource(source))
  }

  const handleReset = () => {
    setSource(PLAYGROUND_SAMPLE)
    setResult({
      ...EMPTY_RESULT,
      stats: {
        ...EMPTY_RESULT.stats,
        sourceChars: PLAYGROUND_SAMPLE.length,
      },
    })
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-2xl border border-fd-border bg-fd-card/70 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              PriyoScript Playground
            </h1>
            <p className="mt-1 text-sm text-fd-muted-foreground">
              Feel the essence of PriyoScript by writing and running code directly in your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={sourceTooLarge}
              className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-background px-4 py-2 text-sm font-medium text-fd-foreground transition hover:border-rose-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="size-4" />
              Run
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-2 text-sm font-medium text-fd-foreground transition hover:border-rose-400 hover:text-rose-500"
            >
              <RotateCcw className="size-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fd-muted-foreground">
          <span>Limit: {PLAYGROUND_LIMITS.maxSourceChars} chars</span>
          <span>Statements: {PLAYGROUND_LIMITS.maxStatements} max</span>
          <span>Last run: {statsLabel}</span>
          {sourceTooLarge ? (
            <span className="text-rose-500">Source is above playground size limit.</span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <EditorPanel
          value={source}
          onChange={setSource}
          maxChars={PLAYGROUND_LIMITS.maxSourceChars}
        />
        <OutputPanel lines={result.lines} error={result.error} />
      </section>
    </div>
  )
}
