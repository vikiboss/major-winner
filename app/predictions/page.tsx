'use client'

import { redirect } from 'next/navigation'
import { events, getEventProgress } from '@/lib/data'

export default function PredictionsPage() {
  const event = events[0]
  const eventProgress = getEventProgress(event)
  redirect(`/predictions/${eventProgress.currentStage || 'stage-1'}`)
}
