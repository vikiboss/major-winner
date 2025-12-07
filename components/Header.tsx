'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { EventSelector } from './EventSelector'

const navItems = [
  { href: '/predictions', label: '竞猜' },
  { href: '/predictors', label: '排行' },
  { href: '/teams', label: '战队' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-surface-0 border-border sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo and Event Selector */}
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2 hover:opacity-80 sm:gap-3"
          >
            <Image
              src="/icon.png"
              alt="Major Winner Logo"
              className="size-6 sm:size-12"
              width={48}
              height={48}
            />
            <div className="flex shrink-0 flex-col items-start sm:flex-row sm:items-center sm:gap-3">
              <span className="text-primary ml-1 text-xs font-semibold sm:ml-0 sm:text-lg">
                Major Winner
              </span>
              <EventSelector />
            </div>
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
                      : 'text-secondary hover:bg-surface-2 hover-text-primary'
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
