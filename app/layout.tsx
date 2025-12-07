import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { EventProvider } from '@/components/EventContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'

import './globals.css'

import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Major Winner - CS2 Major 竞猜结果展示',
  description: '查看 Counter Strike 2 Major 赛事竞猜结果、竞猜准确率排行榜',
  keywords: ['CS2', 'Counter Strike', 'Major', '竞猜', '竞猜', '排行榜'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Major Winner',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} bg-game-dark flex min-h-screen flex-col`}>
        <GoogleAnalytics gaId="G-NRG0R1D14W" />

        <ThemeProvider>
          <EventProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </EventProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
