import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { Geist_Mono } from 'next/font/google'
import { baseOptions } from '@/lib/layout.shared'
import { BookMarkedIcon, Mail } from 'lucide-react'

const geistMono = Geist_Mono({
  subsets: ['latin'],
})

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout {...baseOptions()}
    links={[{
        icon: <BookMarkedIcon />,
        text: 'Docs',
        url: '/docs/stable',
        secondary: false,
      },]}>
      <div className={geistMono.className}>{children}</div>
    </HomeLayout>
  )
}
  