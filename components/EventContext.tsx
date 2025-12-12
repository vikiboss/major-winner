'use client'

import { firstEvent, evt } from '@/lib/data'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

import type { MajorEvent } from '@/types'

interface EventContextType {
  event: MajorEvent
  eventId: string
  setEventId: (id: string) => void
}

const EventContext = createContext<EventContextType | undefined>(undefined)

function useEventContext() {
  const [eventId, setEventId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('major-winner-event-id')

      if (saved && evt.hasEvent(saved)) {
        return saved
      }
    }

    return firstEvent.id
  })

  useEffect(() => {
    if (eventId) {
      localStorage.setItem('major-winner-event-id', eventId)
    }
  }, [eventId])

  return {
    eventId,
    setEventId,
    event: evt.getEvent(eventId),
  }
}

export function EventProvider({ children }: { children: ReactNode }) {
  const ctx = useEventContext()
  return <EventContext value={ctx}>{children}</EventContext>
}

export function useEvent() {
  const context = useContext(EventContext)

  if (context === undefined) {
    throw new Error('useEvent must be used within EventProvider')
  }

  return context
}
