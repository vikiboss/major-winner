import Link from 'next/link'
import {
  events,
  getAllPredictorStats,
  getStageName,
  getEventProgress,
  getActiveStages,
  getEventStatusText,
  isPredictionPossible,
} from '@/lib/data'

export default function Home() {
  const event = events[0]
  const stats = getAllPredictorStats(event.id)
  const eventProgress = getEventProgress(event)
  const activeStages = getActiveStages(event)

  // 只显示有结果的阶段（进行中或已完成）
  const stages = activeStages
    .map((stage) => {
      const stageData =
        stage.id === 'finals' ? event.finals : event[stage.id as 'stage-1' | 'stage-2' | 'stage-3']
      return {
        id: stage.id,
        data: stageData,
        type: stage.id === 'finals' ? ('finals' as const) : ('swiss' as const),
        status: stage.status,
      }
    })
    .filter((s): s is typeof s & { data: NonNullable<typeof s.data> } => s.data !== null)

  return (
    <div className="min-h-screen">
      {/* 顶部标题栏 */}
      <div className="border-border bg-surface-1 border-b">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{event.name}</h1>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-muted text-sm">竞猜追踪 · {stats.length} 位预测者</p>
                <span className="text-muted">·</span>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      eventProgress.currentStage
                        ? 'bg-primary-400 animate-pulse'
                        : eventProgress.eventStatus === 'completed'
                          ? 'bg-win'
                          : 'bg-muted'
                    }`}
                  />
                  <span className="text-sm text-zinc-400">
                    {getEventStatusText(eventProgress.eventStatus)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {eventProgress.canShowLeaderboard && (
                <Link
                  href="/leaderboard"
                  className="bg-surface-2 border-border hover:border-border-active rounded-md border px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  排行榜
                </Link>
              )}
              <Link
                href="/compare"
                className="text-primary-400 bg-primary-500/10 border-primary-500/20 hover:bg-primary-500/15 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                对比预测
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 阶段导航 */}
      <div className="bg-surface-0 border-border sticky top-16 z-40 border-b">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {stages.map((stage) => (
              <a
                key={stage.id}
                href={`#${stage.id}`}
                className="hover:bg-surface-2 shrink-0 rounded-md px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {getStageName(stage.id)}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* 阶段内容 */}
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-8">
        {stages.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="bg-surface-1 border-border mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border">
                <span className="text-muted text-2xl">📅</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">赛事尚未开始</h3>
              <p className="text-muted text-sm">比赛结果将在赛事开始后实时更新</p>
            </div>
          </div>
        ) : (
          stages.map((stage) => (
            <StageSection
              key={stage.id}
              stageId={stage.id}
              stageName={getStageName(stage.id)}
              stageData={stage.data}
              stageType={stage.type}
              event={event}
              stats={stats}
              stageStatus={stage.status}
            />
          ))
        )}
      </div>
    </div>
  )
}

function StageSection({
  stageId,
  stageName,
  stageData,
  stageType,
  event,
  stats,
  stageStatus,
}: {
  stageId: string
  stageName: string
  stageData?: NonNullable<(typeof event)['stage-1']> | NonNullable<typeof event.finals>
  stageType: 'swiss' | 'finals'
  event: (typeof events)[0]
  stats: ReturnType<typeof getAllPredictorStats>
  stageStatus?: 'completed' | 'in_progress'
}) {
  const isSwiss = stageType === 'swiss'
  const swissData = isSwiss ? (stageData as NonNullable<(typeof event)['stage-1']>) : null
  const finalsData = !isSwiss ? (stageData as NonNullable<typeof event.finals>) : null

  return (
    <section id={stageId} className="scroll-mt-32">
      {/* 阶段标题 */}
      <div className="mb-6 flex items-center gap-4">
        <div className="bg-primary-500/10 border-primary-500/20 flex h-10 w-10 items-center justify-center rounded-md border">
          <span className="text-primary-400 text-sm font-bold">
            {stageId === 'finals' ? 'F' : stageId.replace('stage-', '')}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">{stageName}</h2>
            {stageStatus && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  stageStatus === 'completed'
                    ? 'bg-win/10 text-win'
                    : 'bg-primary-500/10 text-primary-400 animate-pulse'
                }`}
              >
                {stageStatus === 'completed' ? '已完成' : '进行中'}
              </span>
            )}
          </div>
          <p className="text-muted text-sm">{isSwiss ? '瑞士轮 · 三败淘汰' : '淘汰赛 · 八进一'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 左侧：比赛结果 */}
        <div className="lg:col-span-4">
          <div className="bg-surface-1 border-border rounded-lg border">
            <div className="border-border border-b px-4 py-3">
              <h3 className="text-sm font-medium text-zinc-300">比赛结果</h3>
            </div>
            <div className="p-4">
              {isSwiss && swissData && (
                <div className="space-y-4">
                  {/* 晋级 */}
                  <div>
                    <p className="text-win mb-2 text-xs font-medium">晋级</p>
                    <div className="space-y-1">
                      {(['3-0', '3-1', '3-2'] as const).map((record) => {
                        const teams = swissData.result[record]
                        if (!teams.length) return null
                        return (
                          <div key={record} className="flex items-center gap-2">
                            <span className="text-muted w-8 font-mono text-xs">{record}</span>
                            <div className="flex flex-wrap gap-1">
                              {teams.map((t) => (
                                <span
                                  key={t}
                                  className="bg-win/10 text-win rounded px-2 py-0.5 text-xs"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* 淘汰 */}
                  <div>
                    <p className="text-lose mb-2 text-xs font-medium">淘汰</p>
                    <div className="space-y-1">
                      {(['2-3', '1-3', '0-3'] as const).map((record) => {
                        const teams = swissData.result[record]
                        if (!teams.length) return null
                        return (
                          <div key={record} className="flex items-center gap-2">
                            <span className="text-muted w-8 font-mono text-xs">{record}</span>
                            <div className="flex flex-wrap gap-1">
                              {teams.map((t) => (
                                <span
                                  key={t}
                                  className="bg-lose/10 text-lose rounded px-2 py-0.5 text-xs"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {!isSwiss && finalsData && (
                <div className="space-y-4">
                  {/* 八进四 和 半决赛 */}
                  {(['8-to-4', '4-to-2'] as const).map((round) => {
                    const names = { '8-to-4': '八进四', '4-to-2': '半决赛' }
                    const result = finalsData.result[round]
                    return (
                      <div key={round}>
                        <p className="text-muted mb-2 text-xs font-medium">{names[round]}</p>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <p className="text-win mb-1 text-[10px]">晋级</p>
                            <div className="flex flex-wrap gap-1">
                              {result.winners.map((t) => (
                                <span
                                  key={t}
                                  className="bg-win/10 text-win rounded px-2 py-0.5 text-xs"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-lose mb-1 text-[10px]">淘汰</p>
                            <div className="flex flex-wrap gap-1">
                              {result.losers.map((t) => (
                                <span
                                  key={t}
                                  className="bg-lose/10 text-lose rounded px-2 py-0.5 text-xs"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* 决赛 - 冠军 */}
                  {finalsData.result['2-to-1'].winner && (
                    <div className="border-border border-t pt-3">
                      <p className="text-primary-400 mb-1 text-xs">🏆 冠军</p>
                      <p className="text-lg font-semibold text-white">
                        {finalsData.result['2-to-1'].winner}
                      </p>
                      {finalsData.result['2-to-1'].loser && (
                        <p className="text-muted text-sm">
                          亚军: {finalsData.result['2-to-1'].loser}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：预测者预测 */}
        <div className="lg:col-span-8">
          <div className="bg-surface-1 border-border rounded-lg border">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-medium text-zinc-300">预测者预测</h3>
              <span className="text-muted text-xs">{stats.length} 人</span>
            </div>
            <div className="divide-border divide-y">
              <PredictorPredictions stageId={stageId} stageType={stageType} event={event} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import { getEventPredictions, calculatePredictorStats } from '@/lib/data'
import type { StagePrediction } from '@/types'

function PredictorPredictions({
  stageId,
  stageType,
  event,
}: {
  stageId: string
  stageType: 'swiss' | 'finals'
  event: (typeof events)[0]
}) {
  const eventPreds = getEventPredictions(event.id)
  if (!eventPreds) return null

  // 获取当前阶段的实际结果
  const stageData =
    stageType === 'swiss' && stageId !== 'finals'
      ? event[stageId as 'stage-1' | 'stage-2' | 'stage-3']
      : null
  const actualResult = stageData?.result

  return (
    <>
      {eventPreds.predictions.map((p) => {
        const stats = calculatePredictorStats(event.id, p.predictor)
        const stageResult = stats?.stageResults.find((s) => s.stageId === stageId)
        const prediction =
          stageId === 'finals' ? p.finals : p[stageId as 'stage-1' | 'stage-2' | 'stage-3']

        return (
          <div key={p.predictor} className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <Link
                href={`/predictors/${encodeURIComponent(p.predictor)}`}
                className="hover:text-primary-400 flex items-center gap-2 transition-colors"
              >
                <span className="font-medium text-white">{p.predictor}</span>
                {p.platform && <span className="text-muted text-xs">{p.platform}</span>}
              </Link>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  stageResult?.passed ? 'bg-win/10 text-win' : 'bg-lose/10 text-lose'
                }`}
              >
                {stageResult?.passed ? '通过' : '未通过'}
              </span>
            </div>

            {prediction && stageType === 'swiss' && (
              <div className="flex gap-6 text-xs">
                <div className="flex flex-wrap gap-1">
                  <span className="text-win">3-0: </span>
                  {(prediction as StagePrediction)['3-0'].map((team, idx) => {
                    const possible = isPredictionPossible(team, '3-0', actualResult)
                    const isCorrect = actualResult?.['3-0']?.includes(team)
                    return (
                      <span key={team}>
                        <span
                          className={
                            isCorrect
                              ? 'text-win font-medium'
                              : !possible
                                ? 'text-lose line-through opacity-60'
                                : 'text-zinc-400'
                          }
                        >
                          {team}
                        </span>
                        {idx < (prediction as StagePrediction)['3-0'].length - 1 && ', '}
                      </span>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-primary-400">3-1/2: </span>
                  {(prediction as StagePrediction)['3-1-or-3-2'].map((team, idx) => {
                    const possible = isPredictionPossible(team, '3-1-or-3-2', actualResult)
                    const isCorrect =
                      actualResult?.['3-1']?.includes(team) || actualResult?.['3-2']?.includes(team)
                    return (
                      <span key={team}>
                        <span
                          className={
                            isCorrect
                              ? 'text-primary-400 font-medium'
                              : !possible
                                ? 'text-lose line-through opacity-60'
                                : 'text-zinc-400'
                          }
                        >
                          {team}
                        </span>
                        {idx < (prediction as StagePrediction)['3-1-or-3-2'].length - 1 && ', '}
                      </span>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-lose">0-3: </span>
                  {(prediction as StagePrediction)['0-3'].map((team, idx) => {
                    const possible = isPredictionPossible(team, '0-3', actualResult)
                    const isCorrect = actualResult?.['0-3']?.includes(team)
                    return (
                      <span key={team}>
                        <span
                          className={
                            isCorrect
                              ? 'text-lose font-medium'
                              : !possible
                                ? 'text-muted line-through opacity-60'
                                : 'text-zinc-400'
                          }
                        >
                          {team}
                        </span>
                        {idx < (prediction as StagePrediction)['0-3'].length - 1 && ', '}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {prediction && stageType === 'finals' && (
              <div className="flex gap-6 text-xs">
                <div>
                  <span className="text-muted">四强: </span>
                  <span className="text-zinc-400">
                    {(prediction as { '8-to-4': string[] })['8-to-4'].join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-muted">决赛: </span>
                  <span className="text-zinc-400">
                    {(prediction as { '4-to-2': string[] })['4-to-2'].join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-primary-400">冠军: </span>
                  <span className="text-zinc-400">
                    {(prediction as { '2-to-1': string | null })['2-to-1'] || '未预测'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
