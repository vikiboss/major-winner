'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/predictors', label: '竞猜' },
  { href: '/teams', label: '战队' },
  { href: '/compare', label: '对比' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-surface-0 border-border sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="bg-primary-500 flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-zinc-900 dark:text-white">
              MW
            </div>
            <span className="text-sm font-semibold text-zinc-900 sm:text-lg dark:text-white">
              Major Winner
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex flex-1 items-center justify-end gap-1" role="navigation">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-1 py-0.5 text-xs font-medium transition-colors sm:px-3 sm:py-1 sm:text-sm ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'hover:bg-surface-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Theme toggle */}
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
