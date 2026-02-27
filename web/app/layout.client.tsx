'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function Body({ children }: { readonly children: ReactNode }): React.ReactElement {
  const mode = useMode()

  return <body className={`${mode ? `${mode} ` : ''}overscroll-y-none`}>{children}</body>
}

export function useMode(): string | undefined {
  const pathname = usePathname() || ''
  if (pathname.startsWith('/docs/stable')) return 'stable'
  if (pathname.startsWith('/docs/canary')) return 'canary'
  return undefined
}
