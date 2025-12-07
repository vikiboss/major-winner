'use client'

import { redirect } from 'next/navigation'
import { useEvent } from '@/components/EventContext'
import { getEventProgress } from '@/lib/data'

export default function PredictionsPage() {
  const { currentEvent } = useEvent()
  const eventProgress = getEventProgress(currentEvent)
  redirect(`/predictions/${eventProgress.currentStage || 'stage-1'}`)
}
