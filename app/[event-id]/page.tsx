import Link from 'next/link'

import {
  countParticipants,
  eventSummaries,
  getAllPredictorStats,
  getEvent,
  getVisibleStages,
} from '@/lib/data'
import { getStageMeta } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StageHeader } from '@/components/stage/stage-header'
import { StagePreview } from '@/components/stage/stage-preview'
import { SwissResultPanel } from '@/components/stage/swiss-result-panel'
import { PlayoffResultPanel } from '@/components/stage/playoff-result-panel'

import type { PlayoffStageType, StageView, SwissStageType } from '@/types'

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

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

export default async function EventPage({ params }: { params: Promise<{ 'event-id': string }> }) {
  const { 'event-id': eventId } = await params

  const event = getEvent(eventId)
  const stats = getAllPredictorStats(eventId)
  const stages = getVisibleStages(eventId)

  return (
    <div className="min-h-screen">
      {/* 顶部标题栏 */}
      <div className="border-border bg-surface-1 border-b">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
          <h1 className="text-primary mb-3 text-2xl font-semibold sm:mb-4 sm:text-4xl lg:text-5xl">
            {event.name}
          </h1>
          <p className="text-muted flex justify-between text-sm sm:text-base">
            竞猜追踪 · {stats.length} 位竞猜者
            <Link href={`/${eventId}/schedule/simulator`} className={HEADER_BUTTON}>
              对阵推演
              <ChevronIcon direction="right" />
            </Link>
          </p>
        </div>
      </div>

      {/* 阶段锚点导航 */}
      {stages.length > 0 && (
        <div className="bg-surface-0 border-border sticky top-12 z-40 border-b sm:top-16">
          <div className="mx-auto max-w-5xl">
            <nav className="stage-nav flex scrollbar-thin gap-2 overflow-x-auto px-4 py-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent">
              {stages.map((stage) => (
                <a
                  key={stage.id}
                  href={`#${stage.id}`}
                  className="hover:bg-surface-2 hover-text-primary text-secondary shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors active:scale-95 sm:min-w-20 sm:px-4 sm:text-sm"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {getStageMeta(stage.id).label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:space-y-12 sm:py-8 lg:space-y-16">
        {stages.length === 0 ? (
          <EmptyState
            icon="📅"
            title="赛事尚未开始"
            description="比赛结果将在赛事开始后实时更新"
            className="flex min-h-100 items-center justify-center"
          />
        ) : (
          // 最新阶段排在最前
          stages
            .toReversed()
            .map((stage) => <StageSection key={stage.id} eventId={eventId} stage={stage} />)
        )}
      </div>
    </div>
  )
}

interface StageSectionProps {
  eventId: string
  stage: StageView
}

/** 单个阶段：左侧比赛结果，右侧竞猜预览 */
function StageSection({ eventId, stage }: StageSectionProps) {
  const event = getEvent(eventId)
  const isSwiss = stage.kind === 'swiss'
  const participants = countParticipants(eventId, stage.id)

  return (
    <section id={stage.id} className="scroll-mt-32">
      <StageHeader stageId={stage.id} status={stage.status} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex lg:col-span-5">
          <Card title="比赛结果" className="flex flex-1 flex-col" bodyClassName="flex-1 p-4">
            {stage.status === 'waiting' ? (
              <EmptyState icon="⏳" title="比赛尚未开始" description="竞猜已提交，等待比赛结果" />
            ) : isSwiss ? (
              <SwissResultPanel result={event[stage.id as SwissStageType].result} />
            ) : (
              <PlayoffResultPanel round={stage.id as PlayoffStageType} playoffs={event.playoffs} />
            )}
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card
            title="竞猜情况"
            action={
              <Link
                href={`/${eventId}/stages/${isSwiss ? stage.id : 'playoffs'}`}
                className="text-secondary hover:text-primary-300 text-xs hover:underline"
              >
                查看全部 ({participants}) ➜
              </Link>
            }
            bodyClassName="divide-border divide-y"
          >
            <StagePreview eventId={eventId} stageId={stage.id} limit={3} />
          </Card>
        </div>
      </div>
    </section>
  )
}
