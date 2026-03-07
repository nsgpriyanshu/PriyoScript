import { ImageResponse } from 'next/og'
import { generate as DefaultImage } from 'fumadocs-ui/og'

export const revalidate = false

export async function GET() {
  return new ImageResponse(
    <DefaultImage
      title="PriyoScript"
      description="Human-first interpreted language with readable syntax, REPL, modules, and strong diagnostics."
      site="PriyoScript"
    />,
    {
      width: 1200,
      height: 630,
    },
  )
}

