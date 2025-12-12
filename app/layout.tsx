import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'

import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://major.viki.moe'),
  title: {
    default: 'Major Winner - CS2 Major 竞猜结果展示',
    template: '%s | Major Winner',
  },
  description:
    "查看 Counter Strike 2 Major 赛事竞猜结果、竞猜准确率排行榜，实时追踪各大主播和玩家的 Pick'em 预测情况。",
  keywords: [
    'CS2',
    'Counter Strike 2',
    'Major',
    "Pick'em",
    '竞猜',
    '预测',
    '排行榜',
    'Major Winner',
    'CSGO',
  ],
  authors: [{ name: 'vikiboss' }],
  creator: 'vikiboss',
  publisher: 'vikiboss',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://socialify.git.ci/vikiboss/major-winner/image?description=1&font=Inter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fmajor.viki.moe%2Ficon.png&name=1&owner=1&pattern=Circuit+Board&pulls=1&stargazers=1&theme=Auto',
    title: 'Major Winner - CS2 Major 竞猜结果展示',
    description: '查看 Counter Strike 2 Major 赛事竞猜结果、竞猜准确率排行榜',
    siteName: 'Major Winner',
    images: [
      {
        url: '/og-image.png', // Make sure to add an og-image.png to your public folder
        width: 1200,
        height: 630,
        alt: 'Major Winner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Major Winner - CS2 Major 竞猜结果展示',
    description: '查看 Counter Strike 2 Major 赛事竞猜结果、竞猜准确率排行榜',
    images: [
      'https://socialify.git.ci/vikiboss/major-winner/image?description=1&font=Inter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fmajor.viki.moe%2Ficon.png&name=1&owner=1&pattern=Circuit+Board&pulls=1&stargazers=1&theme=Auto',
    ],
    creator: '@vikiboss',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Major Winner',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
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
        <Analytics />
        <GoogleAnalytics gaId="G-NRG0R1D14W" />

        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
