import Link from 'next/link'
import {
  events,
  getAllPredictorStats,
  getStageName,
  getEventProgress,
  getActiveStages,
  getEventStatusText,
  isPredictionPossible,
  hasSwissInProgressResults,
  hasSwissFinalResults,
} from '../lib/data'
import TeamLogo from '../components/TeamLogo'

export default function Home() {
  const event = events[0]
  const stats = getAllPredictorStats(event.id)
  const eventProgress = getEventProgress(event)
  const activeStages = getActiveStages(event)

  // 只显示有结果的阶段（进行中或已完成）
  // 将 finals 拆分成三个独立阶段
  type StageItem =
    | {
        id: '8-to-4' | '4-to-2' | '2-to-1'
        data: NonNullable<typeof event.finals>
        type: 'finals-round'
        status: 'completed' | 'in_progress' | 'waiting' | undefined
        round: '8-to-4' | '4-to-2' | '2-to-1'
      }
    | {
        id: string
        data: NonNullable<(typeof event)['stage-1']>
        type: 'swiss'
        status: 'completed' | 'in_progress' | 'waiting' | undefined
      }

  const stages: StageItem[] = activeStages
    .flatMap((stage): StageItem | StageItem[] => {
      // 如果是 finals,拆分成三个子阶段,但只显示有结果或进行中的子阶段
      if (stage.id === 'finals' && event.finals) {
        const finalsResults = event.finals.result
        const rounds: Array<{
          id: '8-to-4' | '4-to-2' | '2-to-1'
          hasResult: boolean
        }> = [
          {
            id: '8-to-4',
            hasResult:
              finalsResults['8-to-4'].winners.length > 0 ||
              finalsResults['8-to-4'].losers.length > 0,
          },
          {
            id: '4-to-2',
            hasResult:
              finalsResults['4-to-2'].winners.length > 0 ||
              finalsResults['4-to-2'].losers.length > 0,
          },
          {
            id: '2-to-1',
            hasResult: finalsResults['2-to-1'].winner !== null,
          },
        ]

        // 找出第一个有结果的轮次，以及之后的所有轮次
        const firstResultIndex = rounds.findIndex((r) => r.hasResult)

        // 如果没有任何结果，不显示任何决赛阶段
        if (firstResultIndex === -1) {
          return []
        }

        // 只显示第一个有结果的轮次及之后的轮次
        return rounds.slice(firstResultIndex).map((round) => ({
          id: round.id,
          data: event.finals!,
          type: 'finals-round' as const,
          status: round.hasResult ? ('in_progress' as const) : ('waiting' as const),
          round: round.id,
        }))
      }
      // 瑞士轮阶段
      const stageData = event[stage.id as 'stage-1' | 'stage-2' | 'stage-3']
      return {
        id: stage.id,
        data: stageData!,
        type: 'swiss' as const,
        status: stage.status,
      }
    })
    .filter((s): s is StageItem => s.data !== null)
    .toReversed()

  return (
    <div className="min-h-screen">
      {/* 顶部标题栏 */}
      <div className="border-border bg-surface-1 border-b">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-primary mb-3 text-2xl font-semibold sm:mb-4 sm:text-4xl lg:text-5xl">
              {event.name}
            </h1>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:text-base">
              <p className="text-muted">竞猜追踪 · {stats.length} 位竞猜者</p>
              <span className="text-muted hidden sm:inline">·</span>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${eventProgress.currentStage ? 'bg-primary-400 animate-pulse' : eventProgress.eventStatus === 'completed' ? 'bg-win' : 'bg-muted'}`}
                />
                <span className="text-secondary">
                  {getEventStatusText(eventProgress.eventStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 阶段导航条 */}
      <div className="bg-surface-0 border-border stage-nav sticky top-16 z-40 border-b">
        <div className="mx-auto max-w-5xl">
          <nav
            className="stage-nav flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:thin] sm:px-4 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent"
            role="navigation"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {stages.map((stage) => (
              <a
                key={stage.id}
                href={`#${stage.id}`}
                className="hover:bg-surface-2 hover-text-primary text-secondary shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors active:scale-95 sm:min-w-20 sm:px-4 sm:text-sm"
                style={{ scrollSnapAlign: 'start' }}
              >
                {getStageName(stage.id as string)}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* 内容区适配，表格/卡片横向滚动优化 */}
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:space-y-12 sm:py-8 lg:space-y-16">
        {stages.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="bg-surface-1 border-border mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border">
                <span className="text-muted text-2xl">📅</span>
              </div>
              <h3 className="text-primary mb-2 text-lg font-medium">赛事尚未开始</h3>
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
              stageStatus={stage.status}
              round={'round' in stage ? stage.round : undefined}
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
  stageStatus,
  round,
}: {
  stageId: string
  stageName: string
  stageData?: NonNullable<(typeof event)['stage-1']> | NonNullable<typeof event.finals>
  stageType: 'swiss' | 'finals-round'
  event: (typeof events)[0]
  stageStatus?: 'completed' | 'in_progress' | 'waiting'
  round?: '8-to-4' | '4-to-2' | '2-to-1'
}) {
  const isSwiss = stageType === 'swiss'
  const swissData = isSwiss ? (stageData as NonNullable<(typeof event)['stage-1']>) : null
  const finalsData =
    stageType === 'finals-round' ? (stageData as NonNullable<typeof event.finals>) : null

  return (
    <section id={stageId} className="scroll-mt-32">
      {/* 阶段标题 */}
      <div className="mb-6 flex items-center gap-4">
        <div className="bg-primary-500/10 border-primary-500/20 flex h-10 w-10 items-center justify-center rounded-md border">
          <span className="text-primary-400 text-sm font-bold">
            {isSwiss
              ? stageId.replace('stage-', '')
              : round === '8-to-4'
                ? '8强'
                : round === '4-to-2'
                  ? '半'
                  : '冠'}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-primary text-xl font-semibold">{stageName}</h2>
            {stageStatus && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  stageStatus === 'completed'
                    ? 'bg-win/10 text-win'
                    : stageStatus === 'in_progress'
                      ? 'bg-primary-500/10 text-primary-400 animate-pulse'
                      : 'bg-yellow-500/10 text-yellow-400'
                }`}
              >
                {stageStatus === 'completed'
                  ? '已完成'
                  : stageStatus === 'in_progress'
                    ? '进行中'
                    : '等待比赛'}
              </span>
            )}
          </div>
          <p className="text-muted text-sm">
            {isSwiss
              ? '瑞士轮 · 三败淘汰'
              : round === '8-to-4'
                ? '淘汰赛 · 八进四'
                : round === '4-to-2'
                  ? '淘汰赛 · 四进二'
                  : '决赛 · 冠军争夺'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 左侧：比赛结果 */}
        <div className="lg:col-span-4">
          <div className="bg-surface-1 border-border rounded-lg border">
            <div className="border-border border-b px-4 py-3">
              <h3 className="text-secondary text-sm font-medium">比赛结果</h3>
            </div>
            <div className="p-4">
              {stageStatus === 'waiting' ? (
                <div className="text-muted py-8 text-center">
                  <div className="mb-2 text-2xl">⏳</div>
                  <p className="text-sm">比赛尚未开始</p>
                  <p className="text-muted mt-1 text-xs">竞猜已提交,等待比赛结果</p>
                </div>
              ) : isSwiss && swissData ? (
                // 检查是否有最终结果或进行中的战绩
                (() => {
                  const hasFinalResults = hasSwissFinalResults(swissData.result)
                  const hasInProgress = hasSwissInProgressResults(swissData.result)

                  // 如果既没有最终结果,也没有进行中的结果,显示占位符
                  if (!hasFinalResults && !hasInProgress) {
                    return (
                      <div className="text-muted py-8 text-center">
                        <div className="mb-2 text-2xl">⚔️</div>
                        <p className="text-sm">比赛进行中</p>
                        <p className="text-muted mt-1 text-xs">结果尚未出炉</p>
                      </div>
                    )
                  }

                  // 进行中的战绩记录(按胜场数从高到低排序)
                  const inProgressRecords = [
                    '2-2', // 2胜
                    '2-1', // 2胜
                    '2-0', // 2胜
                    '1-2', // 1胜
                    '1-1', // 1胜
                    '1-0', // 1胜
                    '0-2', // 0胜
                    '0-1', // 0胜
                  ] as const

                  // 有结果,显示结果内容
                  return (
                    <div className="space-y-4">
                      {/* 进行中的战绩(仅在有进行中战绩时显示) */}
                      {hasInProgress && (
                        <div>
                          <p className="text-secondary mb-2 text-xs font-medium">当前战绩</p>
                          <div className="space-y-2">
                            {inProgressRecords.map((record) => {
                              const teams = swissData.result[record]
                              if (!teams || !teams.length) return null
                              return (
                                <div key={record} className="flex items-start gap-2">
                                  <span className="text-muted w-8 shrink-0 pt-0.5 font-mono text-xs text-nowrap">
                                    {record}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {teams.map((t) => (
                                      <span
                                        key={t}
                                        className="bg-surface-2 text-secondary flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                                      >
                                        <TeamLogo shortName={t} size="xs" />
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* 晋级(仅在有最终结果时显示) */}
                      {hasFinalResults && (
                        <>
                          {/* 晋级队伍 */}
                          {(swissData.result['3-0'].length > 0 ||
                            swissData.result['3-1'].length > 0 ||
                            swissData.result['3-2'].length > 0) && (
                            <div>
                              <p className="text-win mb-2 text-xs font-medium">晋级</p>
                              <div className="space-y-2">
                                {(['3-0', '3-1', '3-2'] as const).map((record) => {
                                  const teams = swissData.result[record]
                                  if (!teams.length) return null
                                  return (
                                    <div key={record} className="flex items-start gap-2">
                                      <span className="text-muted w-8 shrink-0 pt-0.5 font-mono text-xs text-nowrap">
                                        {record}
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {teams.map((t) => (
                                          <span
                                            key={t}
                                            className="bg-win/10 text-win flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                                          >
                                            <TeamLogo shortName={t} size="xs" />
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* 淘汰队伍 */}
                          {(swissData.result['2-3'].length > 0 ||
                            swissData.result['1-3'].length > 0 ||
                            swissData.result['0-3'].length > 0) && (
                            <div>
                              <p className="text-lose mb-2 text-xs font-medium">淘汰</p>
                              <div className="space-y-2">
                                {(['2-3', '1-3', '0-3'] as const).map((record) => {
                                  const teams = swissData.result[record]
                                  if (!teams.length) return null
                                  return (
                                    <div key={record} className="flex items-start gap-2">
                                      <span className="text-muted w-8 shrink-0 pt-0.5 font-mono text-xs text-nowrap">
                                        {record}
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {teams.map((t) => (
                                          <span
                                            key={t}
                                            className="bg-lose/10 text-lose flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                                          >
                                            <TeamLogo shortName={t} size="xs" />
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })()
              ) : null}

              {!isSwiss &&
                finalsData &&
                round &&
                (() => {
                  // 检查当前轮次是否有结果
                  const hasResults =
                    round === '2-to-1'
                      ? finalsData.result['2-to-1'].winner !== null
                      : finalsData.result[round].winners.length > 0 ||
                        finalsData.result[round].losers.length > 0

                  // 如果没有结果，显示进行中提示
                  if (!hasResults) {
                    return (
                      <div className="text-muted py-8 text-center">
                        <div className="mb-2 text-2xl">⚔️</div>
                        <p className="text-sm">比赛进行中</p>
                        <p className="text-muted mt-1 text-xs">结果尚未出炉</p>
                      </div>
                    )
                  }

                  // 有结果，显示结果内容
                  return (
                    <div className="space-y-4">
                      {/* 八进四 和 半决赛 */}
                      {(round === '8-to-4' || round === '4-to-2') && (
                        <div>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <p className="text-win mb-1 text-xs font-medium">晋级</p>
                              <div className="flex flex-wrap gap-1">
                                {finalsData.result[round].winners.map((t) => (
                                  <span
                                    key={t}
                                    className="bg-win/10 text-win flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                                  >
                                    <TeamLogo shortName={t} size="xs" />
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-lose mb-1 text-xs font-medium">淘汰</p>
                              <div className="flex flex-wrap gap-1">
                                {finalsData.result[round].losers.map((t) => (
                                  <span
                                    key={t}
                                    className="bg-lose/10 text-lose flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                                  >
                                    <TeamLogo shortName={t} size="xs" />
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* 决赛 - 冠军 */}
                      {round === '2-to-1' && finalsData.result['2-to-1'].winner && (
                        <div>
                          <p className="text-primary-400 mb-2 text-xs">🏆 冠军</p>
                          <div className="flex items-center gap-2">
                            <TeamLogo shortName={finalsData.result['2-to-1'].winner} size="lg" />
                            <p className="text-primary text-lg font-semibold">
                              {finalsData.result['2-to-1'].winner}
                            </p>
                          </div>
                          {finalsData.result['2-to-1'].loser && (
                            <div className="text-muted mt-2 flex items-center gap-2 text-sm">
                              <TeamLogo shortName={finalsData.result['2-to-1'].loser} size="sm" />
                              <span>亚军: {finalsData.result['2-to-1'].loser}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
            </div>
          </div>
        </div>

        {/* 右侧：竞猜者竞猜 */}
        <div className="lg:col-span-8">
          <div className="bg-surface-1 border-border rounded-lg border">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-secondary text-sm font-medium">竞猜者竞猜</h3>
              <Link
                href="/predictors"
                className="text-primary-400 hover:text-primary-300 text-xs transition-colors"
              >
                查看全部 →
              </Link>
            </div>
            <div className="divide-border divide-y">
              <PredictorPredictions
                stageId={stageId}
                stageType={stageType}
                event={event}
                round={round}
                stageStatus={stageStatus}
                limit={5}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import { getEventPredictions, calculatePredictorStats } from '../lib/data'
import type { StagePrediction } from '../types'

function PredictorPredictions({
  stageId,
  stageType,
  event,
  round,
  stageStatus,
  limit,
}: {
  stageId: string
  stageType: 'swiss' | 'finals-round'
  event: (typeof events)[0]
  round?: '8-to-4' | '4-to-2' | '2-to-1'
  stageStatus?: 'completed' | 'in_progress' | 'waiting'
  limit?: number
}) {
  const eventPreds = getEventPredictions(event.id)
  if (!eventPreds) return null

  // 获取当前阶段的实际结果
  const stageData =
    stageType === 'swiss' ? event[stageId as 'stage-1' | 'stage-2' | 'stage-3'] : null
  const actualResult = stageData?.result

  // 计算每个预测者在当前阶段的正确数,并排序
  const predictorsWithCorrectCount = eventPreds.predictions
    .map((p) => {
      const stats = calculatePredictorStats(event.id, p.name)
      const stageResult = stats?.stageResults.find((s) => s.stageId === stageId)
      return {
        predictor: p,
        correctCount: stageResult?.correctCount || 0,
      }
    })
    .sort((a, b) => b.correctCount - a.correctCount)

  // 如果有 limit,只显示前 N 个
  const displayPredictors = limit
    ? predictorsWithCorrectCount.slice(0, limit)
    : predictorsWithCorrectCount

  return (
    <>
      {displayPredictors.map(({ predictor: p }) => {
        const stats = calculatePredictorStats(event.id, p.name)
        const stageResult = stats?.stageResults.find((s) => s.stageId === stageId)
        const prediction =
          stageType === 'finals-round' ? p.finals : p[stageId as 'stage-1' | 'stage-2' | 'stage-3']

        // 如果没有竞猜数据,显示"等待上一阶段"
        if (!prediction) return null

        return (
          <div key={p.name} className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <Link
                href={`/predictors/${encodeURIComponent(p.name)}`}
                className="hover:text-primary-400 flex items-center gap-2 transition-colors"
              >
                <span className="text-primary font-medium">{p.name}</span>
                {p.platform && <span className="text-muted text-xs">@{p.platform}</span>}
              </Link>
              {/* 只在结束时显示通过/未通过 */}
              {stageResult && (
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    stageStatus === 'completed'
                      ? stageResult.passed
                        ? 'bg-win/10 text-win'
                        : 'bg-lose/10 text-lose'
                      : 'bg-primary-500/10 text-primary-400 animate-pulse'
                  }`}
                >
                  {stageStatus === 'completed'
                    ? stageResult.passed
                      ? '通过'
                      : '未通过'
                    : '进行中'}
                </span>
              )}
            </div>

            {prediction && stageType === 'swiss' && (
              <div className="space-y-2 text-xs">
                {/* 3-0 预测 */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-muted w-12 shrink-0 font-medium">3-0</span>
                  <div className="flex flex-wrap gap-1">
                    {(prediction as StagePrediction)['3-0'].map((team) => {
                      const possible =
                        stageStatus === 'waiting'
                          ? true
                          : isPredictionPossible(team, '3-0', actualResult)
                      const isCorrect =
                        stageStatus === 'waiting' ? false : actualResult?.['3-0']?.includes(team)
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                            stageStatus === 'waiting'
                              ? 'bg-surface-2 text-tertiary'
                              : isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : !possible
                                  ? 'bg-lose/10 text-lose line-through'
                                  : 'bg-surface-2 text-tertiary'
                          }`}
                        >
                          <TeamLogo shortName={team} size="xs" />
                          {team}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* 3-1/2 预测 */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-muted w-12 shrink-0 font-medium">3-1/2</span>
                  <div className="flex flex-wrap gap-1">
                    {(prediction as StagePrediction)['3-1-or-3-2'].map((team) => {
                      const possible =
                        stageStatus === 'waiting'
                          ? true
                          : isPredictionPossible(team, '3-1-or-3-2', actualResult)
                      const isCorrect =
                        stageStatus === 'waiting'
                          ? false
                          : actualResult?.['3-1']?.includes(team) ||
                            actualResult?.['3-2']?.includes(team)
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                            stageStatus === 'waiting'
                              ? 'bg-surface-2 text-tertiary'
                              : isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : !possible
                                  ? 'bg-lose/10 text-lose line-through'
                                  : 'bg-surface-2 text-tertiary'
                          }`}
                        >
                          <TeamLogo shortName={team} size="xs" />
                          {team}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* 0-3 预测 */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-muted w-12 shrink-0 font-medium">0-3</span>
                  <div className="flex flex-wrap gap-1">
                    {(prediction as StagePrediction)['0-3'].map((team) => {
                      const possible =
                        stageStatus === 'waiting'
                          ? true
                          : isPredictionPossible(team, '0-3', actualResult)
                      const isCorrect =
                        stageStatus === 'waiting' ? false : actualResult?.['0-3']?.includes(team)
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                            stageStatus === 'waiting'
                              ? 'bg-surface-2 text-tertiary'
                              : isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : !possible
                                  ? 'bg-lose/10 text-lose line-through'
                                  : 'bg-surface-2 text-tertiary'
                          }`}
                        >
                          <TeamLogo shortName={team} size="xs" />
                          {team}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {prediction && stageType === 'finals-round' && round && (
              <div className="text-xs">
                {(round === '8-to-4' || round === '4-to-2') && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted">竞猜晋级: </span>
                    {(prediction as { '8-to-4': string[]; '4-to-2': string[] })[round].map(
                      (team) => {
                        const roundResult = event.finals?.result[round]
                        const hasResult =
                          roundResult && 'winners' in roundResult && roundResult.winners.length > 0
                        const isCorrect = hasResult && roundResult.winners.includes(team)
                        return (
                          <span
                            key={team}
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                              stageStatus === 'waiting'
                                ? 'bg-surface-2 text-tertiary'
                                : isCorrect
                                  ? 'bg-win/10 text-win font-medium'
                                  : hasResult
                                    ? 'bg-lose/10 text-lose'
                                    : 'bg-surface-2 text-tertiary'
                            }`}
                          >
                            <TeamLogo shortName={team} size="xs" />
                            {team}
                          </span>
                        )
                      },
                    )}
                  </div>
                )}
                {round === '2-to-1' && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted">冠军竞猜: </span>
                    {(prediction as { '2-to-1': string | null })['2-to-1'] ? (
                      <span
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                          stageStatus === 'waiting'
                            ? 'bg-surface-2 text-tertiary'
                            : event.finals?.result['2-to-1'].winner
                              ? (prediction as { '2-to-1': string | null })['2-to-1'] ===
                                event.finals.result['2-to-1'].winner
                                ? 'bg-win/10 text-win font-medium'
                                : 'bg-lose/10 text-lose'
                              : 'bg-surface-2 text-tertiary'
                        }`}
                      >
                        <TeamLogo
                          shortName={(prediction as { '2-to-1': string | null })['2-to-1']!}
                          size="xs"
                        />
                        {(prediction as { '2-to-1': string | null })['2-to-1']}
                      </span>
                    ) : (
                      <span className="text-tertiary text-xs">未竞猜</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
