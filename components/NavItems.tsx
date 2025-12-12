'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/predictions', label: '竞猜' },
  { href: '/predictors', label: '排行' },
  { href: '/teams', label: '战队' },
]

export function NavItems() {
  const pathname = usePathname()

  return (
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
  )
}
