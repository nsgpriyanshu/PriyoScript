import Link from 'next/link'
import { Boxes, Cpu, Github, ShieldAlert, TerminalSquare } from 'lucide-react'
import { createHighlighter } from 'shiki'
import { Footer } from '@/components/footer'
import { FeaturePill } from '@/components/home/feature-pill'
import { HomeTabs } from '@/components/home/home-tabs'
import Wrapper from '@/components/wrapper'
import { HOME_DEMO_TABS } from '@/lib/home-demos'
import { priyoscriptLanguage } from '@/lib/shiki-priyoscript'

const BRAND = '#FF2056'

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [priyoscriptLanguage, 'bash'],
    })
  }
  return highlighterPromise
}

async function highlightTabs() {
  const highlighter = await getHighlighter()
  const highlighted = await Promise.all(
    HOME_DEMO_TABS.map(async tab => {
      const htmlLight = highlighter.codeToHtml(tab.code, {
        lang: tab.lang,
        theme: 'github-light',
      })
      const htmlDark = highlighter.codeToHtml(tab.code, {
        lang: tab.lang,
        theme: 'github-dark',
      })
      return {
        id: tab.id,
        label: tab.label,
        rawCode: tab.code,
        output: tab.output,
        htmlLight,
        htmlDark,
      }
    }),
  )
  return highlighted
}

export default async function HomePage() {
  const highlightedTabs = await highlightTabs()

  return (
    <main className="relative flex-1 overflow-hidden bg-fd-background text-fd-foreground ">
      <div className="pointer-events-none absolute -left-24 top-6 size-64 rounded-full bg-rose-500/10 blur-3xl sm:-left-32 sm:top-10 sm:size-80" />
      <div className="pointer-events-none absolute -right-24 bottom-6 size-64 rounded-full bg-rose-400/10 blur-3xl sm:-right-32 sm:bottom-10 sm:size-80" />

      <Wrapper className="relative z-10 py-8 sm:py-12 lg:py-20">
        <section className="grid w-full items-start gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-semibold tracking-[0.12em] text-fd-muted-foreground">
              v {require('../../../package.json').version}
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:mt-5 sm:text-4xl lg:text-6xl">
              An Emotional
              <br />
              bytecode interpreted programming language
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-fd-muted-foreground sm:mt-5 sm:text-base sm:leading-8 lg:text-lg">
              PriyoScript is a human-first interpreted language with readable keywords, first-class
              arrays, OOP, modules, and production-focused diagnostics.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/docs/stable/installation"
                className="rounded-full border border-white/30 bg-white/15 px-6 py-3 text-center text-base font-semibold text-fd-foreground backdrop-blur-xl transition hover:bg-white/25 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                style={{ boxShadow: `inset 0 0 0 1px ${BRAND}22` }}
              >
                Get Started
              </Link>
              <Link
                href="/docs/stable/quick-start"
                className="rounded-full border border-fd-border bg-fd-card px-6 py-3 text-center text-base font-semibold transition hover:text-rose-600 dark:hover:text-rose-300"
                style={{ borderColor: BRAND }}
              >
                Quick Start
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5 sm:mt-10 sm:gap-3">
              <FeaturePill icon={Github} text="Open Source" />
              <FeaturePill icon={Cpu} text="Bytecode VM" />
              <FeaturePill icon={TerminalSquare} text="REPL" />
              <FeaturePill icon={Boxes} text="Module System" />
              <FeaturePill icon={ShieldAlert} text="Error Codes" />
            </div>
          </div>

          <HomeTabs tabs={highlightedTabs} />
        </section>
      </Wrapper>
    </main>
  )
}
