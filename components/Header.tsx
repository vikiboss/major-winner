'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: '首页' },
  { href: '/predictors', label: '竞猜' },
  { href: '/teams', label: '战队' },
  { href: '/compare', label: '对比' },
]

export function Header() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // 关闭菜单
  const closeMenu = () => setMenuOpen(false)

  // 点击菜单按钮切换
  const toggleMenu = () => setMenuOpen((v) => !v)

  useEffect(() => {
    // 路径变化自动关闭菜单
    closeMenu()
  }, [pathname])

  return (
    <header className="bg-surface-0 border-border header sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary-500 flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-zinc-900 dark:text-white">
              MW
            </div>
            <span className="hidden text-base font-semibold text-zinc-900 sm:block sm:text-lg dark:text-white">
              Major Winner
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 md:flex" role="navigation">
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
                      : 'hover:bg-surface-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
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
            <MobileMenu
              pathname={pathname}
              open={menuOpen}
              onToggle={toggleMenu}
              onClose={closeMenu}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

function MobileMenu({
  pathname,
  open,
  onToggle,
  onClose,
}: {
  pathname: string
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return

    // Close on click outside
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.mobile-menu')) {
        onClose()
      }
    }

    // Close on escape key
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('click', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open, onClose])

  return (
    <div className="relative md:hidden">
      <button
        className="p-3 text-zinc-400 transition-colors active:scale-95 hover:text-zinc-900 dark:hover:text-white"
        onClick={onToggle}
        aria-label="菜单"
        aria-expanded={open}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
          />
        </svg>
      </button>
      {open && (
        <div className="mobile-menu bg-surface-2 border-border absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-5rem)] w-48 overflow-y-auto rounded-lg border shadow-xl">
          <nav className="py-2" role="navigation">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 text-sm font-medium transition-colors active:scale-[0.98] ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-zinc-400 hover:bg-surface-3 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
