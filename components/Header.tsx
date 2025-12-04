'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/leaderboard', label: '竞猜' },
  { href: '/teams', label: '战队' },
  { href: '/compare', label: '对比' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-surface-0 border-border sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-primary-500 flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-white">
              MW
            </div>
            <span className="hidden font-semibold text-white sm:block">Major Winner</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'hover:bg-surface-2 text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <MobileMenu pathname={pathname} />
          </div>
        </div>
      </div>
    </header>
  )
}

function MobileMenu({ pathname }: { pathname: string }) {
  return (
    <div className="group relative md:hidden">
      <button className="p-2 text-zinc-400 transition-colors hover:text-white">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="bg-surface-2 border-border invisible absolute top-full right-0 mt-2 w-40 rounded-md border py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 text-sm ${
                isActive ? 'text-primary-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
