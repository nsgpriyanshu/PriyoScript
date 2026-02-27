import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { Geist_Mono } from 'next/font/google'
import { baseOptions } from '@/lib/layout.shared'

const geistMono = Geist_Mono({
  subsets: ['latin'],
})

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout {...baseOptions()}>
      <div className={geistMono.className}>{children}</div>
    </HomeLayout>
  )
}
