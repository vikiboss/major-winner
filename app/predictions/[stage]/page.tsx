import { notFound } from 'next/navigation'
import {
  events,
  evt,
  calculatePredictorStats,
  isPredictionPossible,
  FINAL_STAGES,
  getEventProgress,
  getStageProgressInfo,
} from '@/lib/data'
import TeamLogo from '@/components/TeamLogo'
import { Metadata } from 'next'
import type { StagePrediction, FinalsPrediction, MajorEvent, PredictorPrediction } from '@/types'

type Stage = 'stage-1' | 'stage-2' | 'stage-3' | 'finals'

const VALID_STAGES: Stage[] = ['stage-1', 'stage-2', 'stage-3', 'finals']

const STAGE_NAMES: Record<Stage, string> = {
  'stage-1': '第一阶段',
  'stage-2': '第二阶段',
  'stage-3': '第三阶段',
  finals: '决胜阶段',
}

interface PageProps {
  params: Promise<{ stage: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { stage } = await params
  const stageName = STAGE_NAMES[stage as Stage] || stage

  return {
    title: `${stageName}竞猜详情`,
    description: `查看 CS2 Major ${stageName}阶段的详细竞猜情况和结果。`,
  }
}

export async function generateStaticParams() {
  return VALID_STAGES.map((stage) => ({
    stage,
  }))
}

export default async function PredictionsPage({ params }: PageProps) {
  const { stage: stageParam } = await params
  const activeStage = stageParam as Stage

  // 验证 stage 参数
  if (!VALID_STAGES.includes(activeStage)) {
    notFound()
  }

  const event = events[0]
  const predictions = evt.getPredictions(event.id)

  if (!predictions.length) {
    return (
      <div className="text-center">
        <p className="text-muted">暂无竞猜数据</p>
      </div>
    )
  }

  // 过滤出有当前阶段预测的竞猜者
  const predictorsWithStage = predictions.filter((p) => {
    if (activeStage === 'finals') {
      return p.finals
    }
    return p[activeStage]
  })

  // 竞猜表格
  return (
    <>
      {activeStage === 'finals' ? (
        <FinalsTable predictors={predictorsWithStage} event={event} />
      ) : (
        <SwissTable predictors={predictorsWithStage} event={event} stageId={activeStage} />
      )}
      <div>
        <p className="text-muted mt-4 text-center text-sm">更多数据正在持续整理中，敬请期待 ✨</p>
      </div>
    </>
  )
}

// 瑞士轮表格组件
function SwissTable({
  predictors,
  event,
  stageId,
}: {
  predictors: PredictorPrediction[]
  event: MajorEvent
  stageId: 'stage-1' | 'stage-2' | 'stage-3'
}) {
  const stageData = event[stageId]
  const actualResult = stageData.result

  const { currentStage } = getEventProgress(event)

  const stageProgress =
    currentStage === stageId && currentStage
      ? getStageProgressInfo(event, currentStage, 'swiss')
      : null

  const isNotStarted =
    currentStage === stageId && stageProgress && stageProgress.status === 'not_started'

  // 排序逻辑：
  // - 有猜对数：按猜对数降序
  // - 无猜对数：按已知错误数升序（错误少的排前面）
  const sortedPredictors = predictors.toSorted((a, b) => {
    const statsA = calculatePredictorStats(event.id, a.id)
    const statsB = calculatePredictorStats(event.id, b.id)

    if (isNotStarted && statsA && statsB) {
      return statsB.totalCorrect - statsA.totalCorrect
    }

    const resultA = statsA?.stageResults.find((s) => s.stageId === stageId)
    const resultB = statsB?.stageResults.find((s) => s.stageId === stageId)

    const correctA = resultA?.correctCount ?? -1
    const correctB = resultB?.correctCount ?? -1

    // 如果有猜对数，优先按猜对数排序
    if (correctB || correctA) {
      return correctB - correctA
    }

    // 如果都未完成（进行中），按已知错误数升序
    const impossibleA = resultA?.impossibleCount ?? 0
    const impossibleB = resultB?.impossibleCount ?? 0

    return impossibleA - impossibleB // 错误少的排前面
  })

  return (
    <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
      {/* 桌面端表格视图 */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-surface-2 border-border border-b">
            <tr>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">竞猜者</th>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">3-0 预测</th>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">
                3-1/3-2 预测
              </th>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">0-3 预测</th>
              <th className="text-secondary px-4 py-3 text-center text-sm font-medium text-nowrap">
                猜对数
              </th>
              <th className="text-secondary px-4 py-3 text-center text-sm font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {sortedPredictors.map((predictor) => {
              const prediction = predictor[stageId] as StagePrediction
              if (!prediction) return null

              const stats = calculatePredictorStats(event.id, predictor.id)
              const stageResult = stats?.stageResults.find((s) => s.stageId === stageId)
              const isInProgress = !stageResult || stageResult.passed === null

              return (
                <tr key={predictor.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-primary text-sm text-nowrap">{predictor.name}</span>
                      {predictor.platform && (
                        <span className="text-primary-400 text-xs text-nowrap">
                          @{predictor.platform}
                        </span>
                      )}
                      {isNotStarted && stats && (
                        <span className="text-muted text-xs text-nowrap">
                          <span className="mr-1 opacity-80">阶段</span>
                          <span className="font-medium">
                            {/* 移除当前瑞士轮未开始阶段的 1 个任务 */}
                            {stats.totalPassed}/{stats.totalStages - 1}
                          </span>
                          <span className="mx-1 opacity-60">|</span>
                          <span className="mr-1 opacity-80">猜对</span>
                          <span className="font-medium">
                            {/* 移除当前瑞士轮未开始阶段的 10 个竞猜 */}
                            {stats.totalCorrect}/{stats.totalPredictions - 10}
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1">
                      {prediction['3-0']
                        .toSorted((p, n) => p.localeCompare(n))
                        .map((team) => {
                          const isCorrect = actualResult?.['3-0']?.includes(team)
                          const possible = isPredictionPossible(team, '3-0', actualResult)
                          return (
                            <TeamLogo
                              hideLabel
                              shortName={team}
                              size="xl"
                              key={team}
                              status={
                                isCorrect ? 'win' : !possible && actualResult ? 'lose' : 'normal'
                              }
                            />
                          )
                        })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {prediction['3-1-or-3-2']
                        .toSorted((p, n) => p.localeCompare(n))
                        .map((team) => {
                          const isCorrect =
                            actualResult?.['3-1']?.includes(team) ||
                            actualResult?.['3-2']?.includes(team)
                          const possible = isPredictionPossible(team, '3-1-or-3-2', actualResult)
                          return (
                            <TeamLogo
                              hideLabel
                              shortName={team}
                              size="xl"
                              key={team}
                              status={
                                isCorrect ? 'win' : !possible && actualResult ? 'lose' : 'normal'
                              }
                            />
                          )
                        })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1">
                      {prediction['0-3']
                        .toSorted((p, n) => p.localeCompare(n))
                        .map((team) => {
                          const isCorrect = actualResult?.['0-3']?.includes(team)
                          const possible = isPredictionPossible(team, '0-3', actualResult)
                          return (
                            <TeamLogo
                              hideLabel
                              shortName={team}
                              size="xl"
                              key={team}
                              status={
                                isCorrect ? 'win' : !possible && actualResult ? 'lose' : 'normal'
                              }
                            />
                          )
                        })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stageResult ? (
                      <span className="text-primary text-base font-semibold">
                        {stageResult.correctCount}
                      </span>
                    ) : (
                      <span className="text-muted text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stageResult ? (
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium text-nowrap ${
                            isInProgress
                              ? 'text-muted'
                              : stageResult.passed
                                ? 'bg-win/20 text-win'
                                : 'bg-lose/20 text-lose'
                          }`}
                        >
                          {isInProgress ? '祈祷中' : stageResult.passed ? '✅ 通过' : '❌ 已炸'}
                        </span>
                        <span className="text-muted text-xs">
                          {stageResult.correctCount}/{stageResult.requiredCount}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">等待中</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {predictors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-center">
                  <span className="text-muted text-sm">暂无竞猜数据</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片视图 */}
      <div className="divide-border divide-y md:hidden">
        {sortedPredictors.map((predictor) => {
          const prediction = predictor[stageId] as StagePrediction
          if (!prediction) return null

          const stats = calculatePredictorStats(event.id, predictor.id)
          const stageResult = stats?.stageResults.find((s) => s.stageId === stageId)
          const isInProgress = !stageResult || stageResult.passed === null

          return (
            <div key={predictor.id} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm text-nowrap">{predictor.name}</span>
                    {predictor.platform && (
                      <p className="text-primary-400 text-xs">@{predictor.platform}</p>
                    )}
                  </div>
                  {isNotStarted && stats && (
                    <span className="text-muted text-xs text-nowrap">
                      <span className="mr-1 opacity-80">阶段</span>
                      <span className="font-medium">
                        {/* 移除当前瑞士轮未开始阶段的 1 个任务 */}
                        {stats.totalPassed}/{stats.totalStages - 1}
                      </span>
                      <span className="mx-1 opacity-60">|</span>
                      <span className="mr-1 opacity-80">猜对</span>
                      <span className="font-medium">
                        {/* 移除当前瑞士轮未开始阶段的 10 个竞猜 */}
                        {stats.totalCorrect}/{stats.totalPredictions - 10}
                      </span>
                    </span>
                  )}
                </div>
                {stageResult && (
                  <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium text-nowrap ${
                          isInProgress
                            ? 'text-muted'
                            : stageResult.passed
                              ? 'bg-win/20 text-win'
                              : 'bg-lose/20 text-lose'
                        }`}
                      >
                        {isInProgress ? '祈祷中' : stageResult.passed ? '✅ 通过' : '❌ 已炸'}
                      </span>
                      <span>
                        <span className="text-primary font-bold">
                          {isNotStarted ? '等待中' : stageResult.correctCount}
                        </span>
                        <span className="text-muted text-xs">/{stageResult.requiredCount}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {/* 3-0 */}
                <div>
                  <p className="text-muted mb-1 text-xs">3-0 预测</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction['3-0']
                      .toSorted((p, n) => p.localeCompare(n))
                      .map((team) => {
                        const isCorrect = actualResult?.['3-0']?.includes(team)
                        const possible = isPredictionPossible(team, '3-0', actualResult)
                        return (
                          <TeamLogo
                            hideLabel
                            shortName={team}
                            size="xl"
                            key={team}
                            status={
                              isCorrect ? 'win' : !possible && actualResult ? 'lose' : 'normal'
                            }
                          />
                        )
                      })}
                  </div>
                </div>

                {/* 3-1/3-2 */}
                <div>
                  <p className="text-muted mb-1 text-xs">3-1/3-2 预测</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction['3-1-or-3-2']
                      .toSorted((p, n) => p.localeCompare(n))
                      .map((team) => {
                        const isCorrect =
                          actualResult?.['3-1']?.includes(team) ||
                          actualResult?.['3-2']?.includes(team)
                        const possible = isPredictionPossible(team, '3-1-or-3-2', actualResult)
                        return (
                          <TeamLogo
                            hideLabel
                            shortName={team}
                            size="xl"
                            key={team}
                            status={
                              isCorrect ? 'win' : !possible && actualResult ? 'lose' : 'normal'
                            }
                          />
                        )
                      })}
                  </div>
                </div>

                {/* 0-3 */}
                <div>
                  <p className="text-muted mb-1 text-xs">0-3 预测</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction['0-3']
                      .toSorted((p, n) => p.localeCompare(n))
                      .map((team) => {
                        const isCorrect = actualResult?.['0-3']?.includes(team)
                        const possible = isPredictionPossible(team, '0-3', actualResult)
                        return (
                          <TeamLogo
                            hideLabel
                            shortName={team}
                            size="xl"
                            key={team}
                            status={
                              isCorrect ? 'win' : !possible && actualResult ? 'lose' : 'normal'
                            }
                          />
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {predictors.length === 0 && (
          <div className="w-full px-4 py-3 text-center">
            <span className="text-muted text-sm">暂无竞猜数据</span>
          </div>
        )}
      </div>
    </div>
  )
}

// 决胜阶段表格组件
function FinalsTable({
  predictors,
  event,
}: {
  predictors: PredictorPrediction[]
  event: MajorEvent
}) {
  const stageData = event.finals
  const finalsResult = stageData.result

  const { currentStage } = getEventProgress(event)

  const stageProgress = currentStage ? getStageProgressInfo(event, currentStage, 'finals') : null

  const isNotStarted =
    currentStage === 'finals' && stageProgress && stageProgress.status === 'not_started'

  // 排序逻辑：
  // - 有猜对数：按猜对数降序
  // - 无猜对数：按已知错误数升序（错误少的排前面）
  const sortedPredictors = predictors.toSorted((a, b) => {
    const statsA = calculatePredictorStats(event.id, a.id)
    const statsB = calculatePredictorStats(event.id, b.id)

    if (isNotStarted && statsA && statsB) {
      return statsB.totalPassed - statsA.totalPassed || statsB.totalCorrect - statsA.totalCorrect
    }

    const finalsStatsA = statsA?.stageResults.filter((s) =>
      FINAL_STAGES.some((e) => e === s.stageId),
    )

    const finalsStatsB = statsB?.stageResults.filter((s) =>
      FINAL_STAGES.some((e) => e === s.stageId),
    )

    const passedA = finalsStatsA?.reduce((sum, s) => sum + (s.passed ? 1 : 0), 0) ?? -1
    const passedB = finalsStatsB?.reduce((sum, s) => sum + (s.passed ? 1 : 0), 0) ?? -1

    const notPassedA = finalsStatsA?.reduce((sum, s) => sum + (s.passed === false ? 1 : 0), 0) ?? -1
    const notPassedB = finalsStatsB?.reduce((sum, s) => sum + (s.passed === false ? 1 : 0), 0) ?? -1

    const correctA = finalsStatsA?.reduce((sum, s) => sum + (s.correctCount || 0), 0) ?? -1
    const correctB = finalsStatsB?.reduce((sum, s) => sum + (s.correctCount || 0), 0) ?? -1

    const impossibleA = finalsStatsA?.reduce((sum, s) => sum + (s.impossibleCount || 0), 0) ?? 0
    const impossibleB = finalsStatsB?.reduce((sum, s) => sum + (s.impossibleCount || 0), 0) ?? 0

    return (
      passedB - passedA ||
      notPassedA - notPassedB ||
      correctB - correctA ||
      impossibleA - impossibleB
    )
  })

  return (
    <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
      {/* 桌面端表格视图 */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-surface-2 border-border border-b">
            <tr>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">竞猜者</th>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">八进四</th>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">半决赛</th>
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">决赛</th>
              <th className="text-secondary px-4 py-3 text-center text-sm font-medium text-nowrap">
                猜对数
              </th>
              <th className="text-secondary px-4 py-3 text-center text-sm font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {sortedPredictors.map((predictor) => {
              const prediction = predictor.finals as FinalsPrediction
              if (!prediction) return null

              const stats = calculatePredictorStats(event.id, predictor.id)
              const finalsStats = stats?.stageResults.filter((s) =>
                FINAL_STAGES.some((e) => e === s.stageId),
              )
              const totalCorrect =
                finalsStats?.reduce((sum, s) => sum + (s.correctCount || 0), 0) ?? 0

              return (
                <tr key={predictor.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-primary text-sm text-nowrap">{predictor.name}</span>
                      {predictor.platform && (
                        <span className="text-primary-400 text-xs">@{predictor.platform}</span>
                      )}
                      {isNotStarted && stats && (
                        <span className="text-muted text-xs text-nowrap">
                          <span className="mr-1 opacity-80">阶段</span>
                          <span className="font-medium">
                            {/* 移除当前瑞士轮未开始阶段的 3 个任务 */}
                            {stats.totalPassed}/{stats.totalStages - 3}
                          </span>
                          <span className="mx-1 opacity-60">|</span>
                          <span className="mr-1 opacity-80">猜对</span>
                          <span className="font-medium">
                            {/* 移除当前瑞士轮未开始阶段的 7（4+2+1） 个竞猜 */}
                            {stats.totalCorrect}/{stats.totalPredictions - 7}
                          </span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 八进四 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['8-to-4'].map((team) => {
                        const isMatch = finalsResult['8-to-4'].winners.includes(team)
                        const isMisMatch = finalsResult['8-to-4'].losers.includes(team)

                        return (
                          <TeamLogo
                            hideLabel
                            shortName={team}
                            size="xl"
                            key={team}
                            status={isMatch ? 'win' : isMisMatch ? 'lose' : 'normal'}
                          />
                        )
                      }) || <span className="text-tertiary text-xs">未竞猜</span>}
                    </div>
                  </td>

                  {/* 半决赛 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['4-to-2']?.map((team) => {
                        const isMatch = finalsResult?.['4-to-2'].winners.includes(team)
                        const isMisMatch =
                          finalsResult?.['4-to-2'].losers.includes(team) ||
                          finalsResult?.['8-to-4'].losers.includes(team)

                        return (
                          <TeamLogo
                            hideLabel
                            shortName={team}
                            size="xl"
                            key={team}
                            status={isMatch ? 'win' : isMisMatch ? 'lose' : 'normal'}
                          />
                        )
                      }) || <span className="text-tertiary text-xs">未竞猜</span>}
                    </div>
                  </td>

                  {/* 决赛 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['2-to-1'] ? (
                        <TeamLogo
                          hideLabel
                          shortName={prediction['2-to-1']}
                          size="xl"
                          status={
                            finalsResult?.['2-to-1'].winner === prediction['2-to-1']
                              ? 'win'
                              : finalsResult?.['2-to-1'].winner ||
                                  finalsResult?.['4-to-2'].losers
                                    .concat(finalsResult?.['8-to-4'].losers)
                                    .includes(prediction['2-to-1'])
                                ? 'lose'
                                : 'normal'
                          }
                        />
                      ) : (
                        <span className="text-tertiary text-xs">未竞猜</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {!isNotStarted && finalsStats && finalsStats.length > 0 ? (
                      <span className="text-primary text-base font-semibold">{totalCorrect}</span>
                    ) : (
                      <span className="text-muted text-sm">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {finalsStats && finalsStats.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        {finalsStats.map((s) => {
                          const stageName =
                            s.stageId === '8-to-4'
                              ? '八进四'
                              : s.stageId === '4-to-2'
                                ? '半决赛'
                                : '决赛'

                          return (
                            <div key={s.stageId} className="flex items-center gap-1">
                              <span className="text-muted text-xs text-nowrap">{stageName}:</span>
                              <span
                                className={`text-xs font-medium text-nowrap ${
                                  s.passed === null
                                    ? 'text-muted'
                                    : s.passed
                                      ? 'text-win'
                                      : 'text-lose'
                                }`}
                              >
                                {s.passed === null ? '祈祷中' : s.passed ? '✅' : '❌'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-muted text-xs">等待中</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {sortedPredictors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-center">
                  <span className="text-muted text-sm">暂无竞猜数据</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片视图 */}
      <div className="divide-border divide-y md:hidden">
        {sortedPredictors.map((predictor) => {
          const prediction = predictor.finals as FinalsPrediction
          if (!prediction) return null

          const stats = calculatePredictorStats(event.id, predictor.id)
          const finalsStats = stats?.stageResults.filter((s) =>
            FINAL_STAGES.some((e) => e === s.stageId),
          )

          const totalCorrect = finalsStats?.reduce((sum, s) => sum + (s.correctCount || 0), 0) ?? 0

          const e2f = finalsStats?.find((s) => s.stageId === '8-to-4')
          const f2t = finalsStats?.find((s) => s.stageId === '4-to-2')
          const t2o = finalsStats?.find((s) => s.stageId === '2-to-1')

          return (
            <div key={predictor.id} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm text-nowrap">{predictor.name}</span>
                    {predictor.platform && (
                      <p className="text-primary-400 text-xs">@{predictor.platform}</p>
                    )}
                  </div>
                  {isNotStarted && stats && (
                    <span className="text-muted text-xs text-nowrap">
                      <span className="mr-1 opacity-80">阶段</span>
                      <span className="font-medium">
                        {/* 移除当前瑞士轮未开始阶段的 3 个任务 */}
                        {stats.totalPassed}/{stats.totalStages - 3}
                      </span>
                      <span className="mx-1 opacity-60">|</span>
                      <span className="mr-1 opacity-80">猜对</span>
                      <span className="font-medium">
                        {/* 移除当前瑞士轮未开始阶段的 7（4+2+1） 个竞猜 */}
                        {stats.totalCorrect}/{stats.totalPredictions - 7}
                      </span>
                    </span>
                  )}
                </div>
                {finalsStats &&
                  finalsStats.length > 0 &&
                  (isNotStarted ? (
                    <span className="text-primary text-xs">等待中</span>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-primary text-lg font-bold">{totalCorrect}</span>
                      <span className="text-muted text-xs text-nowrap">猜对数</span>
                    </div>
                  ))}
              </div>

              <div className="space-y-3">
                {/* 八进四 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-muted text-xs">八进四</p>
                    {e2f && !isNotStarted && (
                      <span
                        className={`text-xs font-medium ${
                          e2f.passed === null ? 'text-muted' : e2f.passed ? 'text-win' : 'text-lose'
                        }`}
                      >
                        {e2f.passed === null ? '祈祷中' : e2f?.passed ? '✅' : '❌'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prediction['8-to-4']?.map((team) => {
                      const isMatch = finalsResult['8-to-4'].winners.includes(team)
                      const isMisMatch = finalsResult['8-to-4'].losers.includes(team)

                      return (
                        <TeamLogo
                          hideLabel
                          shortName={team}
                          size="xl"
                          key={team}
                          status={isMatch ? 'win' : isMisMatch ? 'lose' : 'normal'}
                        />
                      )
                    }) || <span className="text-tertiary text-xs">未竞猜</span>}
                  </div>
                </div>

                {/* 半决赛 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-muted text-xs">半决赛</p>
                    {f2t && !isNotStarted && (
                      <span
                        className={`text-xs font-medium ${
                          f2t.passed === null ? 'text-muted' : f2t.passed ? 'text-win' : 'text-lose'
                        }`}
                      >
                        {f2t.passed === null ? '祈祷中' : f2t.passed ? '✅' : '❌'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prediction['4-to-2']?.map((team) => {
                      const isMatch = finalsResult?.['4-to-2'].winners.includes(team)
                      const isMisMatch = finalsResult?.['4-to-2'].losers.includes(team)

                      return (
                        <TeamLogo
                          hideLabel
                          shortName={team}
                          size="xl"
                          key={team}
                          status={isMatch ? 'win' : isMisMatch ? 'lose' : 'normal'}
                        />
                      )
                    }) || <span className="text-tertiary text-xs">未竞猜</span>}
                  </div>
                </div>

                {/* 决赛 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-muted text-xs">决赛</p>
                    {t2o && !isNotStarted && (
                      <span
                        className={`text-xs font-medium ${
                          t2o.passed === null ? 'text-muted' : t2o.passed ? 'text-win' : 'text-lose'
                        }`}
                      >
                        {t2o.passed === null ? '祈祷中' : t2o?.passed ? '✅' : '❌'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prediction['2-to-1'] ? (
                      <TeamLogo
                        hideLabel
                        shortName={prediction['2-to-1']}
                        size="xl"
                        status={
                          finalsResult?.['2-to-1'].winner === prediction['2-to-1']
                            ? 'win'
                            : finalsResult?.['2-to-1'].winner ||
                                finalsResult?.['4-to-2'].losers
                                  .concat(finalsResult?.['8-to-4'].losers)
                                  .includes(prediction['2-to-1'])
                              ? 'lose'
                              : 'normal'
                        }
                      />
                    ) : (
                      <span className="text-tertiary text-xs">未竞猜</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {sortedPredictors.length === 0 && (
          <div className="w-full px-4 py-3 text-center">
            <span className="text-muted text-sm">暂无竞猜数据</span>
          </div>
        )}
      </div>
    </div>
  )
}
