import { events, getAllPredictorStats, getEventProgress } from '@/lib/data'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '竞猜排行',
  description: '查看 CS2 Major 竞猜准确率排行榜，看看谁是真正的预言家。',
}

export default function PredictorsPage() {
  const event = events[0]
  const stats = getAllPredictorStats(event.id)
  const eventProgress = getEventProgress(event)

  // 显示所有阶段,包括决赛的三个子阶段
  const finalsStage = eventProgress.stagesProgress.find(
    (s: { stageId: string }) => s.stageId === 'finals',
  )
  const finalsSubStages = ['8-to-4', '4-to-2', '2-to-1'].map((id) => ({
    id: id as '8-to-4' | '4-to-2' | '2-to-1',
    hasResults: finalsStage?.hasResults || false,
    isResultsComplete: finalsStage?.isResultsComplete || false,
    status: finalsStage?.status || 'not_started',
  }))

  const allStages = [
    ...eventProgress.stagesProgress
      .filter((s) => s.stageId !== 'finals')
      .map((s) => ({
        id: s.stageId,
        hasResults: s.hasResults,
        isResultsComplete: s.isResultsComplete,
        status: s.status,
      })),
    ...finalsSubStages,
  ]

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-primary text-2xl font-bold sm:text-3xl">竞猜排行</h1>
        <p className="text-muted mt-1 text-sm">
          {`按猜对数排名，共${stats.length} 位竞猜者。通过规则：瑞士轮 5/10，八进四 2/4，半决赛 1/2，决赛猜中冠军`}
        </p>
      </div>

      {/* Mobile Card Layout */}
      <div className="space-y-3 md:hidden">
        {stats.map((stat, index) => (
          <div key={stat.name} className="bg-surface-1 border-border rounded-lg border p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={`text-lg font-bold ${
                    index === 0 ? 'text-primary-400' : index < 3 ? 'text-secondary' : 'text-muted'
                  }`}
                >
                  #{index + 1}
                </span>
                <div>
                  <span className="text-primary block font-medium">{stat.name}</span>
                  {stat.platform && (
                    <span className="text-muted mt-0.5 block text-xs">@{stat.platform}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-primary font-semibold">
                  {stat.totalCorrect}
                  <span className="text-muted text-xs">/{stat.totalPredictions}</span>
                </div>
                <div className="text-muted mt-0.5 text-xs">
                  通过 {stat.totalPassed}/{stat.totalStages}
                </div>
              </div>
            </div>
            <div className="border-border flex flex-wrap gap-2 border-t pt-3">
              {allStages.map((stage) => {
                const result = stat.stageResults.find((s) => s.stageId === stage.id)
                const stageName =
                  stage.id === 'stage-1'
                    ? '第一阶段'
                    : stage.id === 'stage-2'
                      ? '第二阶段'
                      : stage.id === 'stage-3'
                        ? '第三阶段'
                        : stage.id === '8-to-4'
                          ? '八进四'
                          : stage.id === '4-to-2'
                            ? '半决赛'
                            : '决赛'
                return (
                  <div
                    key={stage.id}
                    className="bg-surface-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs"
                  >
                    <span className="text-muted">{stageName}</span>
                    {stage.hasResults ? (
                      stage.isResultsComplete ? (
                        result ? (
                          <span className={result.passed ? 'text-win' : 'text-lose'}>
                            {result.passed ? '✅' : '❌'}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )
                      ) : result ? (
                        <span className="text-muted">
                          {result.correctCount}/{result.requiredCount}（
                          {result.correctCount >= result.requiredCount
                            ? '✅ 通过'
                            : result.impossibleCount >= result.totalCount - result.requiredCount
                              ? `❌ 已炸，已挂 ${result.impossibleCount} 个`
                              : `祈祷中，还剩 ${
                                  result.totalCount - result.correctCount - result.impossibleCount
                                } 个`}
                          ）
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )
                    ) : (
                      <span className="text-muted/50">待定</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="bg-surface-1 border-border hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full min-w-[600px]">
          <thead className="bg-surface-2 border-border border-b">
            <tr className="border-border text-muted border-b text-left text-xs">
              <th className="w-12 px-4 py-3">#</th>
              <th className="px-4 py-3">竞猜者</th>
              <th className="px-4 py-3 text-center">猜对个数</th>
              <th className="px-4 py-3 text-center">任务通过</th>
              <th className="hidden px-4 py-3 text-center md:table-cell">第一阶段</th>
              <th className="hidden px-4 py-3 text-center md:table-cell">第二阶段</th>
              <th className="hidden px-4 py-3 text-center md:table-cell">第三阶段</th>
              <th className="hidden px-4 py-3 text-center lg:table-cell">八进四</th>
              <th className="hidden px-4 py-3 text-center lg:table-cell">半决赛</th>
              <th className="hidden px-4 py-3 text-center lg:table-cell">决赛</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {stats.map((stat, index) => (
              <tr key={stat.name} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <span
                    className={`text-sm font-medium ${
                      index === 0 ? 'text-primary-400' : index < 3 ? 'text-secondary' : 'text-muted'
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span>
                    <span className="text-primary font-medium">{stat.name}</span>
                    {stat.platform && (
                      <span className="text-muted ml-2 text-xs">@{stat.platform}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-primary font-semibold">{stat.totalCorrect}</span>
                  <span className="text-muted text-xs">/{stat.totalPredictions}</span>
                </td>
                <td className="text-muted px-4 py-3 text-center">
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
                              {result.passed ? '✅' : '❌'}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )
                        ) : result ? (
                          <span className="text-muted text-xs">
                            {result.correctCount}/{result.requiredCount}（
                            {result.correctCount >= result.requiredCount
                              ? '✅ 通过'
                              : result.impossibleCount >= result.totalCount - result.requiredCount
                                ? `❌ 已炸，已挂 ${result.impossibleCount} 个`
                                : `祈祷中，还剩 ${
                                    result.totalCount - result.correctCount - result.impossibleCount
                                  } 个`}
                            ）
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

      <div>
        <p className="text-muted mt-4 text-center text-sm">更多数据正在持续整理中，敬请期待 ✨</p>
      </div>
    </div>
  )
}
