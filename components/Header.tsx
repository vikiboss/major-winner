import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from './ThemeToggle'
import { EventSelector } from './EventSelector'
import { GitHubIcon } from './GitHubIcon'
import { NavItems } from './NavItems'

interface HeaderProps {
  eventId: string
}

export function Header({ eventId }: HeaderProps) {
  return (
    <header className="bg-surface-0 border-border sticky top-0 z-50 border-b">
      <div className="mx-auto max-w-5xl px-2 sm:px-4">
        <div className="flex h-12 items-center justify-between gap-0 sm:h-16 sm:gap-3">
          <Link
            href={`/${eventId}`}
            className="flex cursor-pointer items-center gap-2 hover:opacity-80 sm:gap-3"
          >
            <Image
              src="/icon.png"
              alt="Major Winner Logo"
              className="size-6 sm:size-8"
              width={48}
              height={48}
            />
          </Link>

          <div className="flex shrink-0 flex-col items-start sm:flex-row sm:items-center sm:gap-3">
            <span className="text-primary ml-1 text-xs font-semibold sm:ml-0 sm:text-lg">
              Major Winner
            </span>
            <EventSelector eventId={eventId} />
          </div>

          <NavItems eventId={eventId} />

          <div className="flex items-center gap-0 sm:gap-3">
            <div className="shrink-0">
              <ThemeToggle />
            </div>
            <div className="shrink-0">
              <GitHubIcon link="https://github.com/vikiboss/major-winner" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
