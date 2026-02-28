'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { Boxes, Cpu, Github, ShieldAlert, TerminalSquare } from 'lucide-react'

const BRAND = '#FF2056'

const tabs = [
  {
    id: 'script',
    label: 'Create a Script',
    code: `// app.priyo
monalisa {
  lisaaTask greet(name) {
    priyoGiveBack "Hi " + name
  }

  priyoKeep user = priyoListenSentence("Your name: ")
  priyoTell.Success(greet(user))
}`,
  },
  {
    id: 'repl',
    label: 'Run in REPL',
    code: `# Start PriyoScript REPL
monalisa -repl

priyo> priyoKeep x = 10
priyo> priyoTell(x + 5)
15

priyo> .help
priyo> .load examples/basics/main.priyo`,
  },
  {
    id: 'errors',
    label: 'Handle Errors',
    code: `prakritiTry {
  priyoTell(10 / 0)
} prakritiCatch (err) {
  priyoTell.Error(err.message)
  priyoTell.Info(err.code)
} prakritiAtEnd {
  priyoTell("done")
}`,
  },
] as const

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('script')
  const current = tabs.find(tab => tab.id === activeTab) ?? tabs[0]

  return (
    <main className="relative flex-1 overflow-hidden bg-fd-background text-fd-foreground">
      <div className="pointer-events-none absolute -left-32 top-10 size-80 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 size-80 rounded-full bg-rose-400/10 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:gap-12 md:px-10 md:py-20">
        <div>
          <p className="inline-flex rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-semibold tracking-[0.12em] text-fd-muted-foreground">
            v 1.10.0
          </p>
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
            An Emotional
            <br />
            bytecode interpreted programming language
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-fd-muted-foreground sm:text-lg sm:leading-8">
            PriyoScript is a human-first interpreted language with readable keywords, first-class
            arrays, OOP, modules, and production-focused diagnostics.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/docs/stable/installation"
              className="rounded-xl border border-white/30 bg-white/15 px-6 py-3 text-center text-base font-semibold text-fd-foreground backdrop-blur-xl transition hover:bg-white/25 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              style={{ boxShadow: `inset 0 0 0 1px ${BRAND}22` }}
            >
              Get Started
            </Link>
            <Link
              href="/docs/stable/quick-start"
              className="rounded-xl border border-fd-border bg-fd-card px-6 py-3 text-center text-base font-semibold transition hover:text-rose-600 dark:hover:text-rose-300"
              style={{ borderColor: BRAND }}
            >
              Quick Start
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <FeaturePill icon={Github} text="Open Source" />
            <FeaturePill icon={Cpu} text="Bytecode VM" />
            <FeaturePill icon={TerminalSquare} text="REPL" />
            <FeaturePill icon={Boxes} text="Module System" />
            <FeaturePill icon={ShieldAlert} text="Error Codes" />
          </div>
        </div>

        <div className="rounded-2xl border border-fd-border bg-fd-card shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto border-b border-fd-border px-3 py-3 text-sm font-medium md:px-5">
            {tabs.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 transition"
                  style={active ? { color: BRAND, backgroundColor: `${BRAND}14` } : undefined}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <pre className="overflow-x-auto px-4 py-5 text-[13px] leading-7 text-fd-foreground sm:px-5 sm:py-6 sm:text-[15px] sm:leading-8">
            <code>{current.code}</code>
          </pre>
          <div className="flex items-center justify-between border-t border-fd-border px-5 py-3 text-sm text-fd-muted-foreground">
            <span>PriyoScript</span>
            <Link href="/docs/stable/cli-repl" className="hover:underline" style={{ color: BRAND }}>
              View CLI/REPL docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function FeaturePill({
  icon: Icon,
  text,
}: {
  icon: ComponentType<{ className?: string }>
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-3 py-1.5 text-xs font-medium text-fd-muted-foreground">
      <Icon className="size-3.5" />
      {text}
    </span>
  )
}
