import { redirect } from 'next/navigation'

import { eventSummaries, getCurrentStage, getEvent } from '@/lib/data'

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

/** 进入竞猜页时自动跳到当前阶段 */
export default async function StagesIndexPage({
  params,
}: {
  params: Promise<{ 'event-id': string }>
}) {
  const { 'event-id': eventId } = await params
  redirect(`/${eventId}/stages/${getCurrentStage(getEvent(eventId))}`)
}
