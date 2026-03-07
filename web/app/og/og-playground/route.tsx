import { ImageResponse } from 'next/og'
import { generate as DefaultImage } from 'fumadocs-ui/og'

export const revalidate = false

export async function GET() {
  return new ImageResponse(
    <DefaultImage
      title="PriyoScript Playground"
      description="Write and run small PriyoScript programs in-browser with syntax highlighting and humanized errors."
      site="PriyoScript"
    />,
    {
      width: 1200,
      height: 630,
    },
  )
}

