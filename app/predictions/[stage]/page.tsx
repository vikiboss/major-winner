import { notFound } from 'next/navigation'
import {
  events,
  getEventPredictions,
  calculatePredictorStats,
  isPredictionPossible,
  FINAL_STAGES,
} from '@/lib/data'
import TeamLogo from '@/components/TeamLogo'
import type { StagePrediction, FinalsPrediction, FinalStageType } from '@/types'

type Stage = 'stage-1' | 'stage-2' | 'stage-3' | 'finals'

const VALID_STAGES: Stage[] = ['stage-1', 'stage-2', 'stage-3', 'finals']

interface PageProps {
  params: Promise<{ stage: string }>
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
  const eventPreds = getEventPredictions(event.id)

  if (!eventPreds) {
    return (
      <div className="text-center">
        <p className="text-muted">暂无竞猜数据</p>
      </div>
    )
  }

  // 过滤出有当前阶段预测的竞猜者
  const predictorsWithStage = eventPreds.predictions.filter((p) => {
    if (activeStage === 'finals') {
      return p.finals
    }
    return p[activeStage]
  })

  // 竞猜表格
  return activeStage === 'finals' ? (
    <FinalsTable predictors={predictorsWithStage} event={event} />
  ) : (
    <SwissTable
      predictors={predictorsWithStage}
      event={event}
      stageId={activeStage as 'stage-1' | 'stage-2' | 'stage-3'}
    />
  )
}

// 瑞士轮表格组件
function SwissTable({
  predictors,
  event,
  stageId,
}: {
  predictors: any[]
  event: any
  stageId: 'stage-1' | 'stage-2' | 'stage-3'
}) {
  const stageData = event[stageId]
  const actualResult = stageData?.result

  // 排序逻辑：
  // - 有猜对数：按猜对数降序
  // - 无猜对数：按已知错误数升序（错误少的排前面）
  const sortedPredictors = predictors.toSorted((a, b) => {
    const statsA = calculatePredictorStats(event.id, a.id)
    const statsB = calculatePredictorStats(event.id, b.id)
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
                      <span className="text-sm text-nowrap">{predictor.name}</span>
                      {predictor.platform && (
                        <span className="text-muted text-xs text-nowrap">
                          @{predictor.platform}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['3-0'].map((team) => {
                        const isCorrect = actualResult?.['3-0']?.includes(team)
                        const possible = isPredictionPossible(team, '3-0', actualResult)
                        return (
                          <span
                            key={team}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                              isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : !possible && actualResult
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
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['3-1-or-3-2'].map((team) => {
                        const isCorrect =
                          actualResult?.['3-1']?.includes(team) ||
                          actualResult?.['3-2']?.includes(team)
                        const possible = isPredictionPossible(team, '3-1-or-3-2', actualResult)
                        return (
                          <span
                            key={team}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                              isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : !possible && actualResult
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
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['0-3'].map((team) => {
                        const isCorrect = actualResult?.['0-3']?.includes(team)
                        const possible = isPredictionPossible(team, '0-3', actualResult)
                        return (
                          <span
                            key={team}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                              isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : !possible && actualResult
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
                              ? 'bg-primary-500/10 text-primary-500'
                              : stageResult.passed
                                ? 'bg-win/10 text-win'
                                : 'bg-lose/10 text-lose'
                          }`}
                        >
                          {isInProgress
                            ? '祈祷中'
                            : stageResult.passed
                              ? '✅ 作业通过'
                              : '❌ 作业已炸'}
                        </span>
                        <span className="text-muted text-xs">
                          {stageResult.correctCount}/{stageResult.requiredCount}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">待定</span>
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
                <div>
                  <span className="text-primary font-medium">{predictor.name}</span>
                  {predictor.platform && (
                    <p className="text-muted text-xs">@{predictor.platform}</p>
                  )}
                </div>
                {stageResult && (
                  <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                    <span className="text-primary text-lg font-bold">
                      {stageResult.correctCount}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium text-nowrap ${
                        isInProgress
                          ? 'bg-primary-500/10 text-primary-500'
                          : stageResult.passed
                            ? 'bg-win/10 text-win'
                            : 'bg-lose/10 text-lose'
                      }`}
                    >
                      {isInProgress ? '祈祷中' : stageResult.passed ? '✅ 作业通过' : '❌ 作业已炸'}
                    </span>
                    <span className="text-muted text-xs">
                      {stageResult.correctCount}/{stageResult.requiredCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {/* 3-0 */}
                <div>
                  <p className="text-muted mb-1 text-xs">3-0 预测</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction['3-0'].map((team) => {
                      const isCorrect = actualResult?.['3-0']?.includes(team)
                      const possible = isPredictionPossible(team, '3-0', actualResult)
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                            isCorrect
                              ? 'bg-win/10 text-win font-medium'
                              : !possible && actualResult
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

                {/* 3-1/3-2 */}
                <div>
                  <p className="text-muted mb-1 text-xs">3-1/3-2 预测</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction['3-1-or-3-2'].map((team) => {
                      const isCorrect =
                        actualResult?.['3-1']?.includes(team) ||
                        actualResult?.['3-2']?.includes(team)
                      const possible = isPredictionPossible(team, '3-1-or-3-2', actualResult)
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                            isCorrect
                              ? 'bg-win/10 text-win font-medium'
                              : !possible && actualResult
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

                {/* 0-3 */}
                <div>
                  <p className="text-muted mb-1 text-xs">0-3 预测</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction['0-3'].map((team) => {
                      const isCorrect = actualResult?.['0-3']?.includes(team)
                      const possible = isPredictionPossible(team, '0-3', actualResult)
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                            isCorrect
                              ? 'bg-win/10 text-win font-medium'
                              : !possible && actualResult
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

// 决赛阶段表格组件
function FinalsTable({ predictors, event }: { predictors: any[]; event: any }) {
  const finalsResult = event.finals?.result

  // 排序逻辑：
  // - 有猜对数：按猜对数降序
  // - 无猜对数：按已知错误数升序（错误少的排前面）
  const sortedPredictors = [...predictors].sort((a, b) => {
    const statsA = calculatePredictorStats(event.id, a.id)
    const statsB = calculatePredictorStats(event.id, b.id)

    const finalsStatsA = statsA?.stageResults.filter((s) =>
      FINAL_STAGES.some((e) => e === s.stageId),
    )

    const finalsStatsB = statsB?.stageResults.filter((s) =>
      FINAL_STAGES.some((e) => e === s.stageId),
    )

    const correctA = finalsStatsA?.reduce((sum, s) => sum + (s.correctCount || 0), 0) ?? -1
    const correctB = finalsStatsB?.reduce((sum, s) => sum + (s.correctCount || 0), 0) ?? -1

    // 如果都已完成，按猜对数降序
    if (correctB || correctA) {
      return correctB - correctA
    }

    // 如果都未完成（进行中），按已知错误数总和升序
    const impossibleA = finalsStatsA?.reduce((sum, s) => sum + (s.impossibleCount || 0), 0) ?? 0
    const impossibleB = finalsStatsB?.reduce((sum, s) => sum + (s.impossibleCount || 0), 0) ?? 0

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
              <th className="text-secondary px-4 py-3 text-left text-sm font-medium">八强赛</th>
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
                      <span className="text-primary font-medium text-nowrap">{predictor.name}</span>
                      {predictor.platform && (
                        <span className="text-muted text-xs">@{predictor.platform}</span>
                      )}
                    </div>
                  </td>

                  {/* 八强赛 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['8-to-4']?.map((team) => {
                        const isCorrect = finalsResult?.['8-to-4'].winners.includes(team)
                        const hasResult = finalsResult?.['8-to-4'].winners.length > 0
                        return (
                          <span
                            key={team}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                              isCorrect
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
                      }) || <span className="text-tertiary text-xs">未竞猜</span>}
                    </div>
                  </td>

                  {/* 半决赛 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['4-to-2']?.map((team) => {
                        const isCorrect = finalsResult?.['4-to-2'].winners.includes(team)
                        const hasResult = finalsResult?.['4-to-2'].winners.length > 0
                        return (
                          <span
                            key={team}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                              isCorrect
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
                      }) || <span className="text-tertiary text-xs">未竞猜</span>}
                    </div>
                  </td>

                  {/* 决赛 */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {prediction['2-to-1'] ? (
                        <span
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                            finalsResult?.['2-to-1'].winner === prediction['2-to-1']
                              ? 'bg-win/10 text-win font-medium'
                              : finalsResult?.['2-to-1'].winner
                                ? 'bg-lose/10 text-lose'
                                : 'bg-surface-2 text-tertiary'
                          }`}
                        >
                          <TeamLogo shortName={prediction['2-to-1']} size="xs" />
                          {prediction['2-to-1']}
                        </span>
                      ) : (
                        <span className="text-tertiary text-xs">未竞猜</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {finalsStats && finalsStats.length > 0 ? (
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
                            s.stageId === '8-to-4' ? '8强' : s.stageId === '4-to-2' ? '半' : '决'
                          return (
                            <div key={s.stageId} className="flex items-center gap-1">
                              <span className="text-muted text-xs">{stageName}:</span>
                              <span
                                className={`text-xs font-medium ${
                                  !s.isActualResultComplete
                                    ? 'text-primary-500'
                                    : s.passed
                                      ? 'text-win'
                                      : 'text-lose'
                                }`}
                              >
                                {!s.isActualResultComplete ? '⋯' : s.passed ? '✅' : '❌'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-muted text-xs">待定</span>
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

          return (
            <div key={predictor.id} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-primary font-medium">{predictor.name}</span>
                  {predictor.platform && (
                    <p className="text-muted text-xs">@{predictor.platform}</p>
                  )}
                </div>
                {finalsStats && finalsStats.length > 0 && (
                  <div className="flex flex-col items-end">
                    <span className="text-primary text-lg font-bold">{totalCorrect}</span>
                    <span className="text-muted text-xs text-nowrap">猜对数</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* 八强赛 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-muted text-xs">八强赛 (4进2)</p>
                    {finalsStats?.find((s) => s.stageId === '8-to-4') && (
                      <span
                        className={`text-xs font-medium ${
                          !finalsStats.find((s) => s.stageId === '8-to-4')?.isActualResultComplete
                            ? 'text-primary-500'
                            : finalsStats.find((s) => s.stageId === '8-to-4')?.passed
                              ? 'text-win'
                              : 'text-lose'
                        }`}
                      >
                        {!finalsStats.find((s) => s.stageId === '8-to-4')?.isActualResultComplete
                          ? '⋯'
                          : finalsStats.find((s) => s.stageId === '8-to-4')?.passed
                            ? '✅'
                            : '❌'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prediction['8-to-4']?.map((team) => {
                      const isCorrect = finalsResult?.['8-to-4'].winners.includes(team)
                      const hasResult = finalsResult?.['8-to-4'].winners.length > 0
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                            isCorrect
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
                    }) || <span className="text-tertiary text-xs">未竞猜</span>}
                  </div>
                </div>

                {/* 半决赛 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-muted text-xs">半决赛 (2进1)</p>
                    {finalsStats?.find((s) => s.stageId === '4-to-2') && (
                      <span
                        className={`text-xs font-medium ${
                          !finalsStats.find((s) => s.stageId === '4-to-2')?.isActualResultComplete
                            ? 'text-primary-500'
                            : finalsStats.find((s) => s.stageId === '4-to-2')?.passed
                              ? 'text-win'
                              : 'text-lose'
                        }`}
                      >
                        {!finalsStats.find((s) => s.stageId === '4-to-2')?.isActualResultComplete
                          ? '⋯'
                          : finalsStats.find((s) => s.stageId === '4-to-2')?.passed
                            ? '✅'
                            : '❌'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prediction['4-to-2']?.map((team) => {
                      const isCorrect = finalsResult?.['4-to-2'].winners.includes(team)
                      const hasResult = finalsResult?.['4-to-2'].winners.length > 0
                      return (
                        <span
                          key={team}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                            isCorrect
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
                    }) || <span className="text-tertiary text-xs">未竞猜</span>}
                  </div>
                </div>

                {/* 决赛 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-muted text-xs">决赛 (冠军)</p>
                    {finalsStats?.find((s) => s.stageId === '2-to-1') && (
                      <span
                        className={`text-xs font-medium ${
                          !finalsStats.find((s) => s.stageId === '2-to-1')?.isActualResultComplete
                            ? 'text-primary-500'
                            : finalsStats.find((s) => s.stageId === '2-to-1')?.passed
                              ? 'text-win'
                              : 'text-lose'
                        }`}
                      >
                        {!finalsStats.find((s) => s.stageId === '2-to-1')?.isActualResultComplete
                          ? '⋯'
                          : finalsStats.find((s) => s.stageId === '2-to-1')?.passed
                            ? '✅'
                            : '❌'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prediction['2-to-1'] ? (
                      <span
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          finalsResult?.['2-to-1'].winner === prediction['2-to-1']
                            ? 'bg-win/10 text-win font-medium'
                            : finalsResult?.['2-to-1'].winner
                              ? 'bg-lose/10 text-lose'
                              : 'bg-surface-2 text-tertiary'
                        }`}
                      >
                        <TeamLogo shortName={prediction['2-to-1']} size="xs" />
                        {prediction['2-to-1']}
                      </span>
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
