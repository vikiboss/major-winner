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
        <div className="flex h-12 items-center justify-between gap-0 sm:h-16 sm:gap-3">
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
                  className={`rounded px-1 py-0.5 text-xs font-medium transition-all active:scale-95 sm:px-3 sm:py-1 sm:text-sm ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-secondary hover:bg-surface-1 hover:opacity-80'
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
                    <g fill="none">
                      <g clipPath="url(#SVGXv8lpc2Y)">
                        <path
                          fill="currentColor"
                          fillRule="evenodd"
                          d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12"
                          clipRule="evenodd"
                        />
                      </g>
                      <defs>
                        <clipPath id="SVGXv8lpc2Y">
                          <path fill="#fff" d="M0 0h24v24H0z" />
                        </clipPath>
                      </defs>
                    </g>
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
