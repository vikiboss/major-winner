import Link from 'next/link'

import { deriveSwissFixture, eventSummaries, getEvent, teamMap } from '@/lib/data'

import { MAJOR_STAGE_LABEL, SWISS_STAGES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { SimulatorPanel, type SimulatorStageInput } from '@/components/schedule/simulator-panel'

import type { Metadata } from 'next'
import type { MajorEvent, SwissStageType } from '@/types'

/**
 * 页头入口按钮：样式拷贝自赛程面板日期条的 `BUTTON_BASE`（`schedule-panel.tsx`），
 * 尺寸、边框、前景色都与「上一日 / 下一日」一致；
 * `text-secondary` 显式写在按钮上，避免继承 `PageHeader` 里 `<p>` 的 `text-muted` 而发灰。
 */
const HEADER_BUTTON =
  'border-border text-secondary hover:text-primary hover:bg-surface-2 bg-surface-2 hover:border-border-active ml-auto inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap transition-colors active:scale-95 sm:h-8 sm:px-3 sm:text-sm'

/** 左右箭头，与赛程面板的 `ChevronIcon` 同一套描边 */
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
  title: '对阵推演',
  description: '逐场点选赢家，按 CS2 瑞士轮规则实时推演 3-0 到 0-3 的最终分组。',
}

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

interface SimulatorPageProps {
  params: Promise<{ 'event-id': string }>
}

/** 收集各瑞士轮阶段的参赛队伍（含上一阶段晋级队伍） */
function collectStages(event: MajorEvent): SimulatorStageInput[] {
  return SWISS_STAGES.filter((stageId) => {
    const stage = event[stageId]
    return (stage?.teams?.length ?? 0) + (stage?.teamsFromAdvanced?.length ?? 0) === 16
  }).map((stageId) => {
    const stage = event[stageId]
    const teamIds = [...(stage.teams ?? []), ...(stage.teamsFromAdvanced ?? [])]

    return {
      stageId,
      teamIds,
      // 已打完的真实对局：有明细就用明细，否则从登记的战绩里反推能确定的那几场
      fixture: deriveSwissFixture(teamIds, stage.result, stage.matches).matches,
    }
  })
}

export default async function SimulatorPage({ params }: SimulatorPageProps) {
  const { 'event-id': eventId } = await params
  const event = getEvent(eventId)
  const stages = collectStages(event)

  const nameMap = Object.fromEntries(
    [...teamMap.values()].map((team) => [team.id, team.name || team.shortName || team.id]),
  )

  const stageId = event.current === 'playoffs' ? 'stage-3' : event.current

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        title="对阵推演"
        description={`${event.name} · 逐场选择赢家，实时得到 3-0 到 0-3 的最终分组。`}
        extra={
          <Link href={`/${eventId}/schedule`} className={HEADER_BUTTON}>
            <ChevronIcon direction="left" />
            返回赛程
          </Link>
        }
      />

      {stages.length === 0 ? (
        <EmptyState
          icon="🎲"
          title="暂无可推演的阶段"
          description="需要阶段内恰好有 16 支参赛队伍"
        />
      ) : (
        <>
          <div className="text-muted bg-surface-1 border-border mb-4 rounded-lg border px-4 py-3 text-xs leading-relaxed">
            点队伍即可切换该场胜者。已结束的真实对局会按实际结果选定并在右侧显示锁，不能再改；其余对局按种子强弱给出默认剧本，
            点一下就能改成你猜的走向。每轮改完自动重算下一轮配对（同战绩交手、Buchholz
            排序、首尾配对、规避重赛）。当前可推演阶段：
            {stages.map((stage) => MAJOR_STAGE_LABEL[stage.stageId]).join('、')}。
          </div>

          <SimulatorPanel currentStageId={stageId} stages={stages} nameMap={nameMap} />
        </>
      )}
    </div>
  )
}
