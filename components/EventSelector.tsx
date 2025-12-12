'use client'

import { evt } from '@/lib/data'
import { redirect, usePathname } from 'next/navigation'

export function EventSelector({ eventId }: { eventId: string }) {
  const pathname = usePathname()

  const handleEventChange = (newEventId: string) => {
    // 提取当前路径中 eventId 之后的部分（如 /predictions/stage-1）
    const subPath = pathname.substring(pathname.indexOf(eventId) + eventId.length)
    redirect(`/${newEventId}${subPath}`)
  }

  return (
    <select
      value={eventId}
      onChange={(e) => handleEventChange(e.target.value)}
      className="bg-surface-1 text-primary hover:bg-surface-2 rounded border-none px-0 text-left text-[10px] transition-colors sm:px-3 sm:py-1 sm:text-right sm:text-xs"
    >
      {evt.eventNames.map((event) => (
        <option key={event.id} value={event.id} className="bg-surface-1 text-primary text-left">
          {event.name}
        </option>
      ))}
    </select>
  )
}
