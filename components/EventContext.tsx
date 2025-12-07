'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { events } from '@/lib/data'

import type { MajorEvent } from '@/types'

type StateType = 'stage-1' | 'stage-2' | 'stage-3' | 'finals'

interface EventContextType {
  currentEvent: MajorEvent
  currentEventId: StateType
  setCurrentEventId: (id: StateType) => void
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: ReactNode }) {
  const [currentEventId, setCurrentEventId] = useState<StateType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('major-winner-event-id')
      if (saved && events.some((e) => e.id === saved)) {
        return saved as StateType
      }
    }
    return (events[0]?.id || 'stage-1') as StateType
  })

  useEffect(() => {
    if (currentEventId) {
      localStorage.setItem('major-winner-event-id', currentEventId)
    }
  }, [currentEventId])

  const currentEvent = events.find((e) => e.id === currentEventId)!

  return (
    <EventContext.Provider value={{ currentEvent, currentEventId, setCurrentEventId }}>
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvent must be used within EventProvider')
  }
  return context
}
