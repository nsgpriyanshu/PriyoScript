import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Viewport } from 'next'
import type { PropsWithChildren } from 'react'
import { Geist } from 'next/font/google'
import { generateMetadata } from '@/lib/metadata'
import './global.css'
import { Body } from './layout.client'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfb' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1e' },
  ],
  colorScheme: 'light dark',
}

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata = generateMetadata()

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`} suppressHydrationWarning>
      <Body>
        <RootProvider>{children}</RootProvider>
      </Body>
    </html>
  )
}
