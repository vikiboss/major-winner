'use client'

import { event } from '@/lib/data'
import { useEvent } from './EventContext'

export function EventSelector() {
  const { eventId, setEventId } = useEvent()

  return (
    <select
      value={eventId}
      onChange={(e) => setEventId(e.target.value)}
      className="bg-surface-1 text-primary hover:bg-surface-2 rounded border-none px-0 text-left text-[10px] transition-colors sm:px-3 sm:py-1 sm:text-right sm:text-xs"
    >
      {event.eventNames.map((event) => (
        <option key={event.id} value={event.id} className="bg-surface-1 text-primary text-left">
          {event.name}
        </option>
      ))}
    </select>
  )
}
