import Link from 'next/link'
import { events, getAllPredictorStats, getEventProgress, getEventStatusText } from '../../lib/data'

export default function LeaderboardPage() {
  const event = events[0]
  const stats = getAllPredictorStats(event.id)
  const eventProgress = getEventProgress(event)

  // 检查是否有足够的数据显示排行榜
  const hasEnoughData = eventProgress.canShowLeaderboard && stats.length > 0

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">竞猜排行</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-muted text-sm">按猜对数排名</p>
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

      {!hasEnoughData ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="bg-surface-1 border-border mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border">
              <span className="text-muted text-2xl">📊</span>
            </div>
            <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-white">暂无排行数据</h3>
            <p className="text-muted text-sm">至少需要完成一个阶段才能显示排行榜</p>
          </div>
        </div>
      ) : (
        <>
          {/* Leaderboard Table */}
          <LeaderboardTable stats={stats} eventProgress={eventProgress} />

          {/* Rules */}
          <div className="text-muted mt-6 space-y-1 text-xs">
            <p>
              <span className="text-zinc-400">通过规则：</span>瑞士轮 5/10，八进四 2/4，半决赛
              1/2，决赛猜中冠军
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// 提取一个函数来处理决赛阶段的子阶段数据
function getFinalsSubStages(eventProgress: ReturnType<typeof getEventProgress>) {
  const finalsStage = eventProgress.stagesProgress.find(
    (s: { stageId: string }) => s.stageId === 'finals',
  )
  return ['8-to-4', '4-to-2', '2-to-1'].map((id) => ({
    id: id as '8-to-4' | '4-to-2' | '2-to-1',
    hasResults: finalsStage?.hasResults || false,
    isResultsComplete: finalsStage?.isResultsComplete || false,
    status: finalsStage?.status || 'not_started',
  }))
}

function LeaderboardTable({
  stats,
  eventProgress,
}: {
  stats: ReturnType<typeof getAllPredictorStats>
  eventProgress: ReturnType<typeof getEventProgress>
}) {
  // 显示所有阶段,包括决赛的三个子阶段
  const allStages = [
    ...eventProgress.stagesProgress
      .filter((s) => s.stageId !== 'finals')
      .map((s) => ({
        id: s.stageId,
        hasResults: s.hasResults,
        isResultsComplete: s.isResultsComplete,
        status: s.status,
      })),
    ...getFinalsSubStages(eventProgress),
  ]

  return (
    <div className="bg-surface-1 border-border overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-border text-muted border-b text-left text-xs">
            <th className="w-12 px-4 py-3">#</th>
            <th className="px-4 py-3">竞猜者</th>
            <th className="px-4 py-3 text-center">猜对个数</th>
            <th className="hidden px-4 py-3 text-center sm:table-cell">任务通过</th>
            <th className="hidden px-4 py-3 text-center md:table-cell">第一阶段</th>
            <th className="hidden px-4 py-3 text-center md:table-cell">第二阶段</th>
            <th className="hidden px-4 py-3 text-center md:table-cell">第三阶段</th>
            <th className="hidden px-4 py-3 text-center lg:table-cell">八强</th>
            <th className="hidden px-4 py-3 text-center lg:table-cell">半决赛</th>
            <th className="hidden px-4 py-3 text-center lg:table-cell">决赛</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {stats.map((stat, index) => (
            <tr key={stat.predictor} className="hover:bg-surface-2 transition-colors">
              <td className="px-4 py-3">
                <span
                  className={`text-sm font-medium ${
                    index === 0 ? 'text-primary-400' : index < 3 ? 'text-zinc-300' : 'text-muted'
                  }`}
                >
                  {index + 1}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/predictors/${encodeURIComponent(stat.predictor)}`}
                  className="hover:text-primary-400 transition-colors"
                >
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {stat.predictor}
                  </span>
                  {stat.platform && (
                    <span className="text-muted ml-2 text-xs">{stat.platform}</span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {stat.totalCorrect}
                </span>
                <span className="text-muted text-xs">/{stat.totalPredictions}</span>
              </td>
              <td className="text-muted hidden px-4 py-3 text-center sm:table-cell">
                {stat.totalPassed}/{stat.totalStages}
              </td>
              {allStages.map((stage) => {
                const result = stat.stageResults.find((s) => s.stageId === stage.id)
                // 瑞士轮在 md 显示,决赛阶段在 lg 显示
                const hideClass =
                  stage.id === 'stage-1' || stage.id === 'stage-2' || stage.id === 'stage-3'
                    ? 'hidden md:table-cell'
                    : 'hidden lg:table-cell'
                return (
                  <td key={stage.id} className={`px-4 py-3 text-center ${hideClass}`}>
                    {stage.hasResults ? (
                      stage.isResultsComplete ? (
                        result ? (
                          <span className={result.passed ? 'text-win' : 'text-lose'}>
                            {result.passed ? '✓' : '✗'}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )
                      ) : result ? (
                        <span className="text-muted text-xs">
                          {result.correctCount}/{result.requiredCount}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )
                    ) : (
                      <span className="text-muted/50 text-xs">待定</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
