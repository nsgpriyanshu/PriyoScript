import Wrapper from '@/components/wrapper'
import { PlaygroundShell } from '@/components/playground/playground-shell'

export default function PlaygroundPage() {
  return (
    <main className="relative flex-1 overflow-hidden bg-fd-background text-fd-foreground">
      <div className="pointer-events-none absolute -left-24 top-6 size-64 rounded-full bg-rose-500/10 blur-3xl sm:-left-32 sm:top-10 sm:size-80" />
      <div className="pointer-events-none absolute -right-24 bottom-6 size-64 rounded-full bg-rose-400/10 blur-3xl sm:-right-32 sm:bottom-10 sm:size-80" />

      <Wrapper className="relative z-10 py-8 sm:py-12 lg:py-16">
        <PlaygroundShell />
      </Wrapper>
    </main>
  )
}
