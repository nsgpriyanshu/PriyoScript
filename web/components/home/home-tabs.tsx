'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

const BRAND = '#FF2056'

type HomeTab = {
  id: string
  label: string
  rawCode: string
  output: string
  htmlLight: string
  htmlDark: string
}

export function HomeTabs({ tabs }: { tabs: HomeTab[] }) {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? '')
  const [copied, setCopied] = useState(false)
  const current = tabs.find(tab => tab.id === activeTab) ?? tabs[0]

  async function onCopy() {
    if (!current?.rawCode) return
    try {
      await navigator.clipboard.writeText(current.rawCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-sm"
      style={{
        backgroundImage: `radial-gradient(120% 80% at 100% 0%, ${BRAND}22 0%, transparent 55%)`,
      }}
    >
      <div className="scrollbar-hidden flex items-center gap-2 overflow-x-auto border-b border-fd-border px-3 py-3 text-sm font-medium sm:px-4 lg:px-5">
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition sm:text-sm"
              style={active ? { color: BRAND, backgroundColor: `${BRAND}22` } : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="max-h-[360px] overflow-auto px-3 py-4 text-xs leading-6 sm:max-h-[420px] sm:px-4 sm:py-5 sm:text-[13px] sm:leading-7 lg:max-h-[520px] lg:px-5 lg:py-6 lg:text-[15px] lg:leading-8 [&_.line]:leading-[inherit] [&_.shiki]:!m-0 [&_.shiki]:!bg-transparent [&_.shiki]:!p-0">
        {current ? (
          <>
            <div
              className="block dark:hidden"
              dangerouslySetInnerHTML={{ __html: current.htmlLight }}
            />
            <div
              className="hidden dark:block"
              dangerouslySetInnerHTML={{ __html: current.htmlDark }}
            />
          </>
        ) : null}
      </div>

      <div className="border-t border-fd-border px-3 py-3 sm:px-4 lg:px-5">
        <p className="mb-2 text-xs font-medium text-fd-muted-foreground sm:text-sm">Demo Output</p>
        <pre className="max-h-36 overflow-auto rounded-lg border border-fd-border/80 bg-black/90 px-3 py-2 text-[11px] leading-5 text-emerald-300 sm:text-xs">
          <code>{current?.output || '(No output)'}</code>
        </pre>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fd-border px-3 py-3 text-xs text-fd-muted-foreground sm:px-4 sm:text-sm lg:px-5">
        <span className="font-medium">PriyoScript</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-full border border-fd-border bg-fd-card px-3 py-1 transition hover:border-rose-400/50"
            aria-label="Copy code"
            title="Copy code"
          >
            {copied ? (
              <Check className="size-3.5" style={{ color: BRAND }} />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <Link href="/docs/stable/cli-repl" className="hover:underline" style={{ color: BRAND }}>
            View CLI/REPL docs
          </Link>
        </div>
      </div>
    </div>
  )
}
