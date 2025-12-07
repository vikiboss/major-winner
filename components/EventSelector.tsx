'use client'

import { events } from '@/lib/data'
import { useEvent, type StateType } from './EventContext'

export function EventSelector() {
  const { currentEventId, setCurrentEventId } = useEvent()

  return (
    <select
      value={currentEventId}
      onChange={(e) => setCurrentEventId(e.target.value as StateType)}
      className="bg-surface-1 text-primary hover:bg-surface-2 rounded border-none px-0 text-left text-[10px] transition-colors sm:px-3 sm:py-1 sm:text-right sm:text-xs"
    >
      {events.map((event) => (
        <option key={event.id} value={event.id} className="bg-surface-1 text-primary text-left">
          {event.name}
        </option>
      ))}
    </select>
  )
}
