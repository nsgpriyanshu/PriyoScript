import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  children: ReactNode
}

const Wrapper = ({ className, children }: Props) => {
  return (
    <section className={cn('mx-auto h-full w-full px-4 lg:max-w-7xl lg:px-20', className)}>
      {children}
    </section>
  )
}

export default Wrapper
