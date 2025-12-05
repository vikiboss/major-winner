'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { events } from '@/lib/data'

interface EventContextType {
  currentEventId: string
  setCurrentEventId: (id: string) => void
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: ReactNode }) {
  // 默认选择第一个比赛
  const [currentEventId, setCurrentEventId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('major-winner-event-id')
      if (saved && events.some((e) => e.id === saved)) {
        return saved
      }
    }
    return events[0]?.id || ''
  })

  // 保存到 localStorage
  useEffect(() => {
    if (currentEventId) {
      localStorage.setItem('major-winner-event-id', currentEventId)
    }
  }, [currentEventId])

  return (
    <EventContext.Provider value={{ currentEventId, setCurrentEventId }}>
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
