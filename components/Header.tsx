'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { EventSelector } from './EventSelector'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/predictions', label: '竞猜' },
  { href: '/predictors', label: '排行' },
  { href: '/teams', label: '战队' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-surface-0 border-border sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-5xl px-2 sm:px-4">
        <div className="flex h-12 items-center justify-between sm:h-16">
          {/* Logo and Event Selector */}
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2 hover:opacity-80 sm:gap-3"
          >
            <Image
              src="/icon.png"
              alt="Major Winner Logo"
              className="size-6 sm:size-8"
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
                  className={`active:scale-95 rounded px-1 py-0.5 text-xs font-medium transition-all sm:px-3 sm:py-1 sm:text-sm ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-secondary hover:opacity-80 hover:bg-surface-1'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-0 sm:gap-1">
            {/* Theme toggle */}
            <div className="shrink-0">
              <ThemeToggle />
            </div>
            <div className="shrink-0">
              <div className="inline-flex shrink-0 items-center p-1 transition-all hover:opacity-80">
                <a
                  href="https://github.com/vikiboss/major-winner"
                  target="_blank"
                  className="size-5"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
