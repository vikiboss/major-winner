import { evt, getAllPredictorStats, getEventProgress } from '@/lib/data'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '竞猜排行',
  description: '查看 CS2 Major 竞猜准确率排行榜，看看谁是真正的预言家。',
}

export async function generateStaticParams() {
  return evt.eventNames.map((e) => ({ 'event-id': e.id }))
}

export default async function PredictorsPage({
  params,
}: {
  params: Promise<{ 'event-id': string }>
}) {
  const { 'event-id': eventId } = await params
  const event = evt.getEvent(eventId)
  const stats = getAllPredictorStats(eventId)
  const eventProgress = getEventProgress(event)

  // 显示所有阶段,包括决赛的三个子阶段
  const playoffsStage = eventProgress.stagesProgress.find(
    (s: { stageId: string }) => s.stageId === 'playoffs',
  )

  const playoffsSubStages = ['8-to-4', '4-to-2', '2-to-1'].map((id) => ({
    id: id as '8-to-4' | '4-to-2' | '2-to-1',
    hasResults: playoffsStage?.hasResults || false,
    isResultsComplete: playoffsStage?.isResultsComplete || false,
    status: playoffsStage?.status || 'not_started',
  }))

  const allStages = [
    ...eventProgress.stagesProgress
      .filter((s) => s.stageId !== 'playoffs')
      .map((s) => ({
        id: s.stageId,
        hasResults: s.hasResults,
        isResultsComplete: s.isResultsComplete,
        status: s.status,
      })),
    ...playoffsSubStages,
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
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-12 text-center text-lg font-bold ${
                    index === 0 ? 'text-primary-400' : index < 3 ? 'text-secondary' : 'text-muted'
                  }`}
                >
                  #{index + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-primary block font-medium">{stat.name}</span>
                  {stat.platform && (
                    <span className="text-primary-400 inline-flex items-center text-xs">
                      @{stat.platform}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div className="text-primary">
                  <span className="text-muted mr-1 text-xs">阶段</span>
                  {stat.totalPassed}
                  <span className="text-muted text-xs">/{stat.totalStages}</span>
                </div>
                <div className="text-primary">
                  <span className="text-muted mr-1 text-xs">正确</span>
                  {stat.totalCorrect}
                  <span className="text-muted text-xs">/{stat.totalPredictions}</span>
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
                          {result.passed === true ? (
                            '✅'
                          ) : result.passed === false ? (
                            `❌`
                          ) : (
                            <span className="text-xs">
                              祈祷中 {result.correctCount}/{result.requiredCount}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )
                    ) : (
                      <span className="text-muted/50">等待中</span>
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
              <th className="px-4 py-3 text-nowrap">竞猜者</th>
              <th className="px-4 py-3 text-center text-nowrap">猜对个数</th>
              <th className="px-4 py-3 text-center text-nowrap">任务通过</th>
              <th className="hidden px-4 py-3 text-center text-nowrap md:table-cell">第一阶段</th>
              <th className="hidden px-4 py-3 text-center text-nowrap md:table-cell">第二阶段</th>
              <th className="hidden px-4 py-3 text-center text-nowrap md:table-cell">第三阶段</th>
              <th className="hidden px-4 py-3 text-center text-nowrap lg:table-cell">八进四</th>
              <th className="hidden px-4 py-3 text-center text-nowrap lg:table-cell">半决赛</th>
              <th className="hidden px-4 py-3 text-center text-nowrap lg:table-cell">决赛</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {stats
              .filter((e) => e.name !== '赛果')
              .map((stat, index) => (
                <tr key={stat.name} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-medium ${
                        index === 0
                          ? 'text-primary-400'
                          : index < 3
                            ? 'text-secondary'
                            : 'text-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span>
                      <span className="text-primary font-medium">{stat.name}</span>
                      {stat.platform && (
                        <span className="text-primary-400 ml-2 text-xs">@{stat.platform}</span>
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
                    // 瑞士轮在 md 显示,决胜阶段在 lg 显示
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
                            <span className="text-muted">
                              {result.passed === true ? (
                                '✅'
                              ) : result.passed === false ? (
                                `❌`
                              ) : (
                                <span className="text-xs">
                                  祈祷中 {result.correctCount}/{result.requiredCount}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )
                        ) : (
                          <span className="text-muted/50 text-xs">等待中</span>
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
