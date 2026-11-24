import Link from 'next/link'

import { eventSummaries, getEvent } from '@/lib/data'
import { buildTeamMap } from '@/lib/schedule/teams'
import { PageHeader } from '@/components/ui/page-header'
import { SchedulePanel } from '@/components/schedule/schedule-panel'

import type { Metadata } from 'next'

/**
 * 页头入口按钮：样式拷贝自赛程面板日期条的 `BUTTON_BASE`（`schedule-panel.tsx`），
 * 尺寸、边框、前景色都与「上一日 / 下一日」一致；
 * `text-secondary` 显式写在按钮上，避免继承 `PageHeader` 里 `<p>` 的 `text-muted` 而发灰。
 */
const HEADER_BUTTON =
  'border-border text-secondary hover:text-primary hover:bg-surface-2 bg-surface-2 hover:border-border-active ml-auto inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap transition-colors active:scale-95 sm:h-8 sm:px-3 sm:text-sm'

/** 向右箭头，与赛程面板的 `ChevronIcon` 同一套描边 */
function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

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
          <Link href={`/${eventId}/schedule/simulator`} className={HEADER_BUTTON}>
            赛事推演
            <ChevronIcon direction="right" />
          </Link>
        }
      />

      <SchedulePanel teamMap={teamMap} />
    </div>
  )
}
