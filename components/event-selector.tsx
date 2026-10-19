'use client'

import { usePathname, useRouter } from 'next/navigation'

export interface EventOption {
  id: string
  name: string
  shortName: string
}

interface EventSelectorProps {
  eventId: string
  events: EventOption[]
}

/** 赛事切换下拉框：保留当前子路径 */
export function EventSelector({ eventId, events }: EventSelectorProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleChange = (nextEventId: string) => {
    // /2026-cologne/teams -> /<nextEventId>/teams
    const subPath = pathname.split('/').slice(2).join('/')
    router.push(`/${nextEventId}${subPath ? `/${subPath}` : ''}`)
  }

  return (
    <select
      value={eventId}
      onChange={(event) => handleChange(event.target.value)}
      aria-label="切换赛事"
      className="bg-surface-1 text-primary hover:bg-surface-2 rounded border-none px-0 text-left text-[10px] transition-colors sm:px-3 sm:py-1 sm:text-right sm:text-xs"
    >
      {events.map((event) => (
        <option key={event.id} value={event.id} className="bg-surface-1 text-primary text-left">
          {event.shortName}
        </option>
      ))}
    </select>
  )
}
