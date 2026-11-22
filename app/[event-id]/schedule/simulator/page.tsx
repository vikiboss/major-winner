import Link from 'next/link'

import { eventSummaries, getEvent, teamMap } from '@/lib/data'
import { MAJOR_STAGE_LABEL, SWISS_STAGES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { SimulatorPanel, type StageTeamPool } from '@/components/schedule/simulator-panel'

import type { Metadata } from 'next'
import type { MajorEvent } from '@/types'

export const metadata: Metadata = {
  title: '赛事推演',
  description: '按 CS2 瑞士轮规则模拟比赛，推演各阶段可能的晋级与淘汰分组。',
}

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

interface SimulatorPageProps {
  params: Promise<{ 'event-id': string }>
}

/** 收集各瑞士轮阶段可推演的队伍（含上一阶段晋级队伍） */
function collectPools(event: MajorEvent): StageTeamPool[] {
  return SWISS_STAGES.filter((stageId) => {
    const stage = event[stageId]
    return (stage?.teams?.length ?? 0) + (stage?.teamsFromAdvanced?.length ?? 0) === 16
  }).map((stageId) => {
    const stage = event[stageId]
    const ids = [...(stage.teams ?? []), ...(stage.teamsFromAdvanced ?? [])]

    return {
      stageId,
      teams: ids.map((id) => ({ id, name: teamMap.get(id)?.name ?? id })),
    }
  })
}

export default async function SimulatorPage({ params }: SimulatorPageProps) {
  const { 'event-id': eventId } = await params
  const event = getEvent(eventId)
  const pools = collectPools(event)

  const nameMap = Object.fromEntries(
    [...teamMap.values()].map((team) => [team.id, team.name || team.shortName || team.id]),
  )

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader title="赛事推演" description={`${event.name} · 按瑞士轮规则模拟比赛结果。`}>
        <Link href={`/${eventId}/schedule`} className="text-primary-400 ml-2 hover:underline">
          ← 返回赛程
        </Link>
      </PageHeader>

      {pools.length === 0 ? (
        <EmptyState
          icon="🎲"
          title="暂无可推演的阶段"
          description="需要阶段内恰好有 16 支参赛队伍"
        />
      ) : (
        <>
          <div className="text-muted bg-surface-1 border-border mb-4 rounded-lg border px-4 py-3 text-xs">
            当前可推演：
            {pools.map((pool) => `${MAJOR_STAGE_LABEL[pool.stageId]}（${pool.teams.length} 队）`).join('、')}
            。推演只模拟瑞士轮，结果每次随机。
          </div>

          <SimulatorPanel pools={pools} nameMap={nameMap} />
        </>
      )}
    </div>
  )
}
