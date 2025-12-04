import Link from 'next/link'
import { events, getAllPredictorStats, getEventProgress, getEventStatusText } from '@/lib/data'

export default function LeaderboardPage() {
  const event = events[0]
  const stats = getAllPredictorStats(event.id)
  const eventProgress = getEventProgress(event)

  // 检查是否有足够的数据显示排行榜
  const hasEnoughData = eventProgress.canShowLeaderboard && stats.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">排行榜</h1>
        <div className="mt-1 flex items-center gap-3">
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
            <h3 className="mb-2 text-lg font-medium text-white">暂无排行数据</h3>
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

function LeaderboardTable({
  stats,
  eventProgress,
}: {
  stats: ReturnType<typeof getAllPredictorStats>
  eventProgress: ReturnType<typeof getEventProgress>
}) {
  // 只显示有结果的阶段列
  const visibleStages = eventProgress.stagesProgress
    .filter((s) => s.hasResults)
    .map((s) => s.stageId)

  return (
    <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-border text-muted border-b text-left text-xs">
            <th className="w-12 px-4 py-3">#</th>
            <th className="px-4 py-3">预测者</th>
            <th className="px-4 py-3 text-center">猜对</th>
            <th className="hidden px-4 py-3 text-center sm:table-cell">通过</th>
            {visibleStages.includes('stage-1') && (
              <th className="hidden px-4 py-3 text-center md:table-cell">S1</th>
            )}
            {visibleStages.includes('stage-2') && (
              <th className="hidden px-4 py-3 text-center md:table-cell">S2</th>
            )}
            {visibleStages.includes('stage-3') && (
              <th className="hidden px-4 py-3 text-center lg:table-cell">S3</th>
            )}
            {visibleStages.includes('finals') && (
              <th className="hidden px-4 py-3 text-center lg:table-cell">F</th>
            )}
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
                  <span className="font-medium text-white">{stat.predictor}</span>
                  {stat.platform && (
                    <span className="text-muted ml-2 text-xs">{stat.platform}</span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="font-semibold text-white">{stat.totalCorrect}</span>
                <span className="text-muted text-xs">/{stat.totalPredictions}</span>
              </td>
              <td className="text-muted hidden px-4 py-3 text-center sm:table-cell">
                {stat.totalPassed}/{stat.totalStages}
              </td>
              {visibleStages.map((stageId) => {
                // 对于 finals，检查所有三个子阶段
                let result
                if (stageId === 'finals') {
                  // 简化：只看是否有任何决赛阶段通过
                  result = stat.stageResults.find(
                    (s) =>
                      s.stageId === '8-to-4' || s.stageId === '4-to-2' || s.stageId === '2-to-1',
                  )
                } else {
                  result = stat.stageResults.find((s) => s.stageId === stageId)
                }
                const hideClass =
                  stageId === 'stage-1' || stageId === 'stage-2'
                    ? 'hidden md:table-cell'
                    : 'hidden lg:table-cell'
                return (
                  <td key={stageId} className={`px-4 py-3 text-center ${hideClass}`}>
                    {result ? (
                      <span className={result.passed ? 'text-win' : 'text-lose'}>
                        {result.passed ? '✓' : '✗'}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
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
