import Link from 'next/link'
import Wrapper from './wrapper'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-fd-border/80 text-sm ">
      <Wrapper className="relative z-10 py-2 md:py-4 lg:py-6">
        <div className="flex flex-col items-start justify-between gap-2 text-fd-muted-foreground sm:flex-row sm:items-center">
          <p>© {year} PriyoScript. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/docs/stable" className="hover:text-fd-foreground">
              Docs
            </Link>
            <Link href="/docs/stable/quick-start" className="hover:text-fd-foreground">
              Quick Start
            </Link>
            <a
              href="https://github.com/nsgpriyanshu/PriyoScript"
              target="_blank"
              rel="noreferrer"
              className="hover:text-fd-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </Wrapper>
    </footer>
  )
}
