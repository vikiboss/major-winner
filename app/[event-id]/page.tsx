import Link from 'next/link'
import {
  evt,
  getAllPredictorStats,
  getStageName,
  getEventProgress,
  getActiveStages,
  getEventStatusText,
  isSwissPredictionPossible,
  hasSwissInProgressResults,
  hasSwissPlayoffResults,
} from '@/lib/data'
import { STAGE_TYPE } from '@/lib/constants'
import TeamLogo from '@/components/TeamLogo'
import { calculatePredictorStats } from '@/lib/data'

import type { StagePrediction, StageType } from '@/types'
import type {
  PlayoffsStage,
  PlayoffStageType,
  MajorEvent,
  SwissStage,
  SwissStageType,
  TaskStageType,
} from '@/types'

export async function generateStaticParams() {
  return evt.eventNames.map((e) => ({ 'event-id': e.id }))
}

// 只显示有结果的阶段（进行中或已完成）
// 将 playoffs 拆分成三个独立阶段
type TaskStageItem =
  | {
      id: PlayoffStageType
      data: PlayoffsStage
      type: 'playoffs'
      status: 'completed' | 'in_progress' | 'waiting'
      round: PlayoffStageType
    }
  | {
      id: SwissStageType
      data: SwissStage
      type: 'swiss'
      status: 'completed' | 'in_progress' | 'waiting'
    }

export default async function Event({ params }: { params: Promise<{ 'event-id': string }> }) {
  const { 'event-id': eventId } = await params

  const event = evt.getEvent(eventId)
  const stats = getAllPredictorStats(event.id)
  const eventProgress = getEventProgress(event)
  const activeStages = getActiveStages(event)

  const stages: TaskStageItem[] = activeStages
    .flatMap((stage): TaskStageItem | TaskStageItem[] => {
      // 如果是 playoffs, 拆分成三个子阶段,但只显示有结果或进行中的子阶段
      const hasPredictions = stage.hasPredictions

      if (stage.id === 'playoffs') {
        if (!event.playoffs) return []

        const results = event.playoffs.result

        const rounds: {
          id: PlayoffStageType
          status: 'not_started' | 'in_progress' | 'waiting' | 'completed'
        }[] = [
          {
            id: '8-to-4',
            status: hasPredictions
              ? results['8-to-4'].winners.length > 0
                ? results['8-to-4'].winners.length === 4
                  ? 'completed'
                  : 'in_progress'
                : 'waiting'
              : 'not_started',
          },
          {
            id: '4-to-2',
            status:
              hasPredictions && results['8-to-4'].winners.length === 4
                ? results['4-to-2'].winners.length > 0
                  ? results['4-to-2'].winners.length === 2
                    ? 'in_progress'
                    : 'completed'
                  : 'waiting'
                : 'not_started',
          },
          {
            id: '2-to-1',
            status:
              hasPredictions &&
              results['8-to-4'].winners.length === 4 &&
              results['4-to-2'].winners.length === 2
                ? results['2-to-1'].winner
                  ? 'completed'
                  : 'waiting'
                : 'not_started',
          },
        ]

        return rounds
          .filter((e) => e.status !== 'not_started')
          .map((round) => ({
            id: round.id,
            data: event.playoffs!,
            type: STAGE_TYPE.PLAYOFFS,
            status: round.status as 'completed' | 'in_progress' | 'waiting',
            round: round.id,
          }))
      }

      // 瑞士轮阶段
      const stageData = event[stage.id]

      return {
        id: stage.id as SwissStageType,
        data: stageData! as SwissStage,
        type: STAGE_TYPE.SWISS,
        status: stage.status,
      }
    })
    .filter((s): s is TaskStageItem => s.data !== null)
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
      <div className="bg-surface-0 border-border stage-nav sticky top-12 z-40 border-b sm:top-16">
        <div className="mx-auto max-w-5xl">
          <nav
            className="stage-nav flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:thin] sm:px-4 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent"
            role="navigation"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {stages.toReversed().map((stage) => (
              <a
                key={stage.id}
                href={`#${stage.id}`}
                className="hover:bg-surface-2 hover-text-primary text-secondary shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors active:scale-95 sm:min-w-20 sm:px-4 sm:text-sm"
                style={{ scrollSnapAlign: 'start' }}
              >
                {getStageName(stage.id)}
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
  stageId: TaskStageType
  stageName: string
  stageData?: SwissStage | PlayoffsStage
  stageType: StageType
  event: MajorEvent
  stageStatus?: 'completed' | 'in_progress' | 'waiting'
  round?: PlayoffStageType
}) {
  const isSwiss = stageType === STAGE_TYPE.SWISS
  const swissData = isSwiss ? (stageData as SwissStage) : null
  const playoffsData = stageType === STAGE_TYPE.PLAYOFFS ? (stageData as PlayoffsStage) : null

  const predictions =
    evt
      .getPredictions(event.id)
      .filter((e) =>
        stageType === STAGE_TYPE.SWISS
          ? e[stageId as SwissStageType]?.['0-3']?.length
          : e.playoffs?.[stageId as PlayoffStageType]?.length,
      ) || []

  return (
    <section id={stageId} className="scroll-mt-32">
      {/* 阶段标题 */}
      <div className="mb-6 flex items-center gap-4">
        <div className="bg-primary-500/10 border-primary-500/20 flex h-10 w-10 items-center justify-center rounded-md border">
          <span className={`text-primary-400 font-bold`}>
            {isSwiss
              ? stageId.replace('stage-', 'S')
              : round === '8-to-4'
                ? 'F1'
                : round === '4-to-2'
                  ? 'F2'
                  : 'F3'}
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
                    : '等待中'}
              </span>
            )}
          </div>
          <p className="text-muted text-sm">
            {isSwiss
              ? '瑞士轮 · 三败淘汰'
              : round === '8-to-4'
                ? '决胜阶段 · 八进四'
                : round === '4-to-2'
                  ? '决胜阶段 · 四进二'
                  : '决赛 · 冠军争夺'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 左侧：比赛结果 */}
        <div className="lg:col-span-5">
          <div className="bg-surface-1 border-border rounded-lg border">
            <div className="border-border border-b px-4 py-3">
              <h3 className="text-secondary text-sm font-medium">比赛结果</h3>
            </div>
            <div className="p-4">
              {stageStatus === 'waiting' && (
                <div className="text-muted py-8 text-center">
                  <div className="mb-2 text-2xl">⏳</div>
                  <p className="text-sm">比赛尚未开始</p>
                  <p className="text-muted mt-1 text-xs">竞猜已提交，等待比赛结果</p>
                </div>
              )}

              {stageStatus !== 'waiting' && isSwiss && swissData
                ? // 检查是否有最终结果或进行中的战绩
                  (() => {
                    const hasPlayoffResults = hasSwissPlayoffResults(swissData.result)
                    const hasInProgress = hasSwissInProgressResults(swissData.result)

                    // 如果既没有最终结果,也没有进行中的结果,显示占位符
                    if (!hasPlayoffResults && !hasInProgress) {
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
                                    <span className="text-muted w-8 shrink-0 pt-0.5 text-xs text-nowrap">
                                      {record}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {teams.map((t) => (
                                        <TeamLogo key={t} shortName={t} />
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* 晋级(仅在有最终结果时显示) */}
                        {hasPlayoffResults && (
                          <>
                            {/* 晋级队伍 */}
                            {(swissData.result['3-0'].length > 0 ||
                              swissData.result['3-1'].length > 0 ||
                              swissData.result['3-2'].length > 0) && (
                              <div>
                                <p className="text-win mb-2 font-medium">晋级</p>
                                <div className="space-y-2">
                                  {(['3-0', '3-1', '3-2'] as const).map((record) => {
                                    const teams = swissData.result[record]
                                    if (!teams.length) return null
                                    return (
                                      <div key={record} className="flex items-start gap-2">
                                        <span className="text-muted w-8 shrink-0 pt-0.5 text-xs text-nowrap">
                                          {record}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {teams.map((t) => (
                                            <TeamLogo key={t} shortName={t} status="win" />
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
                                <p className="text-lose mb-2 font-medium">淘汰</p>
                                <div className="space-y-2">
                                  {(['2-3', '1-3', '0-3'] as const).map((record) => {
                                    const teams = swissData.result[record]
                                    if (!teams.length) return null
                                    return (
                                      <div key={record} className="flex items-start gap-2">
                                        <span className="text-muted w-8 shrink-0 pt-0.5 text-xs text-nowrap">
                                          {record}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {teams.map((t) => (
                                            <TeamLogo key={t} shortName={t} status="lose" />
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
                : null}

              {stageStatus !== 'waiting' &&
                !isSwiss &&
                playoffsData &&
                round &&
                (() => {
                  // 检查当前轮次是否有结果
                  const hasResults =
                    round === '2-to-1'
                      ? playoffsData.result['2-to-1'].winner !== null
                      : playoffsData.result[round].winners.length > 0 ||
                        playoffsData.result[round].losers.length > 0

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
                        <div className="flex flex-col gap-2 sm:gap-4">
                          <div className="flex-1">
                            <p className="text-muted mb-1 font-medium">等待比赛</p>
                            <div className="flex flex-wrap gap-1">
                              {playoffsData.teams
                                .filter(
                                  (e) =>
                                    !playoffsData.result[round].winners.includes(e) &&
                                    !playoffsData.result[round].losers.includes(e),
                                )
                                .map((t) => (
                                  <TeamLogo key={t} shortName={t} />
                                ))}
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <p className="text-win mb-1 font-medium">晋级</p>
                              <div className="flex flex-wrap gap-1">
                                {playoffsData.result[round].winners.map((t) => (
                                  <TeamLogo key={t} shortName={t} status="win" />
                                ))}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-lose mb-1 font-medium">淘汰</p>
                              <div className="flex flex-wrap gap-1">
                                {playoffsData.result[round].losers.map((t) => (
                                  <TeamLogo key={t} shortName={t} status="lose" />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* 决赛 - 冠军 */}
                      {round === '2-to-1' && playoffsData.result['2-to-1'].winner && (
                        <div>
                          <p className="text-primary-400 mb-2 text-xs">🏆 冠军</p>
                          <div className="flex items-center gap-2">
                            <TeamLogo
                              shortName={playoffsData.result['2-to-1'].winner}
                              size="lg"
                              hideLabel
                            />
                            <p className="text-primary text-lg font-semibold">
                              {playoffsData.result['2-to-1'].winner}
                            </p>
                          </div>
                          {playoffsData.result['2-to-1'].loser && (
                            <div className="text-muted mt-2 flex items-center gap-2 text-sm">
                              <TeamLogo
                                shortName={playoffsData.result['2-to-1'].loser}
                                size="sm"
                                hideLabel
                              />
                              <span>亚军: {playoffsData.result['2-to-1'].loser}</span>
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

        {/* 右侧：竞猜情况 */}
        <div className="lg:col-span-7">
          <div className="bg-surface-1 border-border rounded-lg border">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-secondary text-sm font-medium">竞猜情况</h3>
              <Link
                href={`${event.id}/predictions/${stageType === STAGE_TYPE.PLAYOFFS ? 'playoffs' : stageId}`}
                className="text-secondary hover:text-primary-300 text-xs hover:underline"
              >
                查看全部 ({predictions.length}) ➜
              </Link>
            </div>
            <div className="divide-border divide-y">
              <PredictorPredictions
                stageId={stageId}
                stageType={stageType}
                event={event}
                round={round}
                stageStatus={stageStatus}
                limit={3}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PredictorPredictions({
  stageId,
  stageType,
  event,
  round,
  stageStatus,
  limit,
}: {
  stageId: TaskStageType
  stageType: StageType
  event: MajorEvent
  round?: PlayoffStageType
  stageStatus?: 'completed' | 'in_progress' | 'waiting'
  limit?: number
}) {
  const predictions = evt.getPredictions(event.id)
  if (!predictions.length) return null

  // 获取当前阶段的实际结果
  const stageData = stageType === STAGE_TYPE.SWISS ? event[stageId as SwissStageType] : null
  const actualResult = stageData?.result

  // 计算每个预测者在当前阶段的错误数,并排序(错误最少的排前面)
  const predictorsWithStats = predictions
    .filter((e) => e.id !== 'result') // 排除比赛结果
    .map((p) => {
      const stats = calculatePredictorStats(event.id, p.id)
      const stageResult = stats?.stageResults.find((s) => s.stageId === stageId)

      // 计算错误数: 总预测数 - 正确数 - 仍有可能的数
      let totalPredictions = 0
      let correctCount = stageResult?.correctCount || 0
      let incorrectCount = 0

      if (stageType === STAGE_TYPE.SWISS) {
        const prediction = p[stageId as SwissStageType]
        if (prediction && actualResult) {
          totalPredictions = 10 // 瑞士轮固定10个预测

          // 统计已经确认错误的预测(不可能成真的)
          for (const team of prediction['3-0']) {
            if (
              !isSwissPredictionPossible(team, '3-0', actualResult) &&
              !actualResult['3-0']?.includes(team)
            ) {
              incorrectCount++
            }
          }
          for (const team of prediction['3-1-or-3-2']) {
            if (
              !isSwissPredictionPossible(team, '3-1-or-3-2', actualResult) &&
              !actualResult['3-1']?.includes(team) &&
              !actualResult['3-2']?.includes(team)
            ) {
              incorrectCount++
            }
          }
          for (const team of prediction['0-3']) {
            if (
              !isSwissPredictionPossible(team, '0-3', actualResult) &&
              !actualResult['0-3']?.includes(team)
            ) {
              incorrectCount++
            }
          }
        }
      }

      return {
        predictor: p,
        correctCount,
        incorrectCount,
        totalPredictions,
        totalCorrect: stats?.totalCorrect || 0,
        totalPassed: stats?.totalPassed || 0,
      }
    })
    .toSorted((a, b) => {
      // 先按错误数升序(错误少的在前)
      // 错误数相同，按正确数降序(正确多的在前)
      // 正确数相同，按总通过阶段数降序
      // 总通过阶段数相同，按总正确数降序
      return (
        a.incorrectCount - b.incorrectCount ||
        b.correctCount - a.correctCount ||
        b.totalPassed - a.totalPassed ||
        b.totalCorrect - a.totalCorrect
      )
    })

  // 如果有 limit,只显示前 N 个
  const displayPredictors = limit
    ? predictorsWithStats
        .filter(({ predictor: p }) => {
          const prediction =
            stageType === STAGE_TYPE.PLAYOFFS ? p.playoffs : p[stageId as SwissStageType]
          return prediction
        })
        .slice(0, limit)
    : predictorsWithStats

  return (
    <>
      {displayPredictors.map(({ predictor: p }) => {
        const stats = calculatePredictorStats(event.id, p.id)
        const stageResult = stats?.stageResults.find((s) => s.stageId === stageId)
        const prediction =
          stageType === STAGE_TYPE.PLAYOFFS ? p.playoffs : p[stageId as SwissStageType]

        return (
          <div key={p.id} className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-primary font-medium text-nowrap">{p.name}</span>
                {p.platform && (
                  <span className="text-primary-400 text-xs text-nowrap">@{p.platform}</span>
                )}
              </span>
              {/* 只在结束时显示通过/未通过 */}
              {stageResult && (
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    stageStatus === 'completed'
                      ? stageResult.passed
                        ? 'bg-win/10 text-win'
                        : 'bg-lose/10 text-lose'
                      : stageStatus === 'in_progress'
                        ? 'bg-primary-500/10 text-primary-400 animate-pulse'
                        : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {stageStatus === 'completed'
                    ? stageResult.passed
                      ? '通过'
                      : '未通过'
                    : stageStatus === 'in_progress'
                      ? '进行中'
                      : '等待中'}
                </span>
              )}
            </div>

            {prediction && stageType === STAGE_TYPE.SWISS && (
              <div className="space-y-2 text-xs">
                {/* 3-0 预测 */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-muted w-12 shrink-0">3-0</span>
                  <div className="flex flex-wrap gap-1">
                    {(prediction as StagePrediction)['3-0']
                      .toSorted((p, n) => p.localeCompare(n))
                      .map((team) => {
                        const possible =
                          stageStatus === 'waiting'
                            ? true
                            : isSwissPredictionPossible(team, '3-0', actualResult)

                        const isCorrect =
                          stageStatus === 'waiting' ? false : actualResult?.['3-0']?.includes(team)

                        const status =
                          stageStatus === 'waiting'
                            ? 'normal'
                            : isCorrect
                              ? 'win'
                              : !possible
                                ? 'lose'
                                : 'normal'

                        return <TeamLogo key={team} shortName={team} status={status} />
                      })}
                  </div>
                </div>

                {/* 3-1/2 预测 */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-muted w-12 shrink-0">3-1/2</span>
                  <div className="flex flex-wrap gap-1">
                    {(prediction as StagePrediction)['3-1-or-3-2']
                      .toSorted((p, n) => p.localeCompare(n))
                      .map((team) => {
                        const possible =
                          stageStatus === 'waiting'
                            ? true
                            : isSwissPredictionPossible(team, '3-1-or-3-2', actualResult)
                        const isCorrect =
                          stageStatus === 'waiting'
                            ? false
                            : actualResult?.['3-1']?.includes(team) ||
                              actualResult?.['3-2']?.includes(team)

                        const status =
                          stageStatus === 'waiting'
                            ? 'normal'
                            : isCorrect
                              ? 'win'
                              : !possible
                                ? 'lose'
                                : 'normal'

                        return <TeamLogo key={team} shortName={team} status={status} />
                      })}
                  </div>
                </div>

                {/* 0-3 预测 */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-muted w-12 shrink-0">0-3</span>
                  <div className="flex flex-wrap gap-1">
                    {(prediction as StagePrediction)['0-3']
                      .toSorted((p, n) => p.localeCompare(n))
                      .map((team) => {
                        const possible =
                          stageStatus === 'waiting'
                            ? true
                            : isSwissPredictionPossible(team, '0-3', actualResult)
                        const isCorrect =
                          stageStatus === 'waiting' ? false : actualResult?.['0-3']?.includes(team)

                        const status =
                          stageStatus === 'waiting'
                            ? 'normal'
                            : isCorrect
                              ? 'win'
                              : !possible
                                ? 'lose'
                                : 'normal'

                        return <TeamLogo key={team} shortName={team} status={status} />
                      })}
                  </div>
                </div>
              </div>
            )}

            {prediction && stageType === STAGE_TYPE.PLAYOFFS && round && (
              <div className="text-xs">
                {(round === '8-to-4' || round === '4-to-2') && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-muted">竞猜晋级: </span>
                    {(prediction as { '8-to-4': string[]; '4-to-2': string[] })[round].map(
                      (team) => {
                        const roundResult = event.playoffs?.result[round]
                        const hasResult =
                          roundResult && 'winners' in roundResult && roundResult.winners.length > 0
                        const isCorrect = hasResult && roundResult.winners.includes(team)
                        const isWrong = hasResult && roundResult.losers.includes(team)
                        const status =
                          stageStatus === 'waiting'
                            ? 'normal'
                            : isCorrect
                              ? 'win'
                              : isWrong
                                ? 'lose'
                                : 'normal'

                        return <TeamLogo key={team} shortName={team} status={status} />
                      },
                    )}
                  </div>
                )}
                {round === '2-to-1' && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-muted">冠军竞猜: </span>
                    {(prediction as { '2-to-1': string | null })['2-to-1'] ? (
                      <TeamLogo
                        shortName={(prediction as { '2-to-1': string | null })['2-to-1']!}
                        status={
                          stageStatus === 'waiting'
                            ? 'normal'
                            : event.playoffs?.result['2-to-1'].winner
                              ? (prediction as { '2-to-1': string | null })['2-to-1'] ===
                                event.playoffs.result['2-to-1'].winner
                                ? 'win'
                                : 'lose'
                              : 'normal'
                        }
                      />
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
