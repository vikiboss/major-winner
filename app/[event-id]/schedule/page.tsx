import Link from 'next/link'

import { eventSummaries, getEvent } from '@/lib/data'
import { buildTeamMap } from '@/lib/schedule/teams'
import { PageHeader } from '@/components/ui/page-header'
import { SchedulePanel } from '@/components/schedule/schedule-panel'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '赛程',
  description: '按天查看 CS2 Major 的比赛安排与比分，可左右切换上下一天。',
}

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

interface SchedulePageProps {
  params: Promise<{ 'event-id': string }>
}

/**
 * 赛程页。
 *
 * 赛程不在 `data/events.json` 里维护：首屏只是骨架，
 * 具体对局由 `SchedulePanel` 在浏览器中直接请求赛事方接口，
 * 只保留赛事名含 `Major` 的场次，并按天切换展示。
 */
export default async function SchedulePage({ params }: SchedulePageProps) {
  const { 'event-id': eventId } = await params
  const event = getEvent(eventId)

  // 队名/队标用本项目资源：接口只给队名，这里把「队名 → 战队资料」的映射传下去
  const teamMap = buildTeamMap()

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      <PageHeader
        title="赛程"
        description={`${event.name} · 实时数据来自赛事官方，可左右切换上下一天。`}
        showUpdatedAt={false}
        extra={
          <Link
            href={`/${eventId}/schedule/simulator`}
            className="bg-primary-500 hover:bg-primary-600 ml-auto shrink-0 rounded px-3 py-1 text-xs font-semibold text-white transition-colors active:scale-95"
          >
            赛事推演 ➜
          </Link>
        }
      />

      <SchedulePanel teamMap={teamMap} />
    </div>
  )
}
