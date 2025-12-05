'use client'

import { events } from '@/lib/data'
import { useEvent } from './EventContext'

export function EventSelector() {
  const { currentEventId, setCurrentEventId } = useEvent()

  return (
    <select
      value={currentEventId}
      onChange={(e) => setCurrentEventId(e.target.value)}
      className="rounded border-border bg-surface-1 px-2 py-1 text-xs text-primary transition-colors hover:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-primary-400 sm:px-3 sm:text-sm"
    >
      {events.map((event) => (
        <option key={event.id} value={event.id} className="bg-surface-1 text-primary">
          {event.name}
        </option>
      ))}
    </select>
  )
}
