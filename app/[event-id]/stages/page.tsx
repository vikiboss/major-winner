import { redirect } from 'next/navigation'
import { evt, getEventProgress } from '@/lib/data'

export async function generateStaticParams() {
  return evt.eventNames.map((e) => ({ 'event-id': e.id }))
}

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ 'event-id': string }>
}) {
  const { 'event-id': eventId } = await params
  const event = evt.getEvent(eventId)
  const evtProgress = getEventProgress(event)
  redirect(`/${eventId}/stages/${evtProgress.currentStage || 'stage-1'}`)
}
