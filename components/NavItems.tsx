'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = (id: string) => [
  { href: `/${id}`, label: '首页' },
  { href: `/${id}/predictions`, label: '竞猜' },
  { href: `/${id}/predictors`, label: '排行' },
  { href: `/${id}/teams`, label: '战队' },
]

export function NavItems({ eventId }: { eventId: string }) {
  const pathname = usePathname()
  const homeHref = `/${eventId}`

  return (
    <nav className="flex flex-1 items-center justify-end gap-1" role="navigation">
      {navItems(eventId).map((item) => {
        const isExactMatch = pathname === item.href
        const isSubPathMatch = item.href !== homeHref && pathname.startsWith(item.href)
        const isActive = isExactMatch || isSubPathMatch

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
