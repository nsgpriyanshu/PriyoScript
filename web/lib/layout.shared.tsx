import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import Image from 'next/image'

export const logo = (
  <>
    {/* Light theme logo */}
    <Image
      alt="PriyoScript"
      src="/logo-light.svg"
      height={25}
      width={25}
      className="block dark:hidden"
      aria-label="PriyoScript"
      priority
    />

    {/* Dark theme logo */}
    <Image
      alt="PriyoScript"
      src="/logo-dark.svg"
      height={25}
      width={25}
      className="hidden dark:block"
      aria-label="PriyoScript"
      priority
    />
  </>
)

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          {logo}
          <span className="font-medium">PriyoScript</span>
        </div>
      ),
    },
  }
}
