import { eventSummaries, getAllPredictorStats, getStageViews } from '@/lib/data'
import { RESULT_PREDICTOR_ID, getStageMeta } from '@/lib/constants'
import { rankTone } from '@/lib/format'
import { PageHeader } from '@/components/ui/page-header'
import { PredictorIdentity } from '@/components/predictor/predictor-identity'
import { PassMark } from '@/components/stage/pass-mark'

import type { Metadata } from 'next'
import type { StagePassStatus, StageView } from '@/types'

export const metadata: Metadata = {
  title: '竞猜排行',
  description: '查看 CS2 Major 竞猜准确率排行榜，看看谁是真正的预言家。',
}

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ 'event-id': string }>
}) {
  const { 'event-id': eventId } = await params

  const stats = getAllPredictorStats(eventId).filter((s) => s.id !== RESULT_PREDICTOR_ID)
  const views = getStageViews(eventId)

  const statusOf = (stageResults: StagePassStatus[], view: StageView) =>
    stageResults.find((s) => s.stageId === view.id)

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        title="竞猜排行"
        description={`按通过任务数与猜对数排名，共 ${stats.length} 位竞猜者。通过规则：瑞士轮 5/10，八进四 2/4，半决赛 1/2，决赛猜中冠军。Ctrl + F 快速搜索。`}
      />

      {/* 移动端卡片 */}
      <div className="space-y-3 md:hidden">
        {stats.map((stat, index) => (
          <div key={stat.id} className="bg-surface-1 border-border rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className={`w-12 text-center text-lg font-bold ${rankTone(index)}`}>
                  #{index + 1}
                </span>
                <PredictorIdentity predictor={stat} />
              </div>
              <div className="text-primary flex items-center gap-2 text-right">
                <div>
                  <span className="text-muted mr-1 text-xs">阶段</span>
                  {stat.totalPassed}
                  <span className="text-muted text-xs">/{stat.totalStages}</span>
                </div>
                <div>
                  <span className="text-muted mr-1 text-xs">正确</span>
                  {stat.totalCorrect}
                  <span className="text-muted text-xs">/{stat.totalPredictions}</span>
                </div>
              </div>
            </div>

            <div className="border-border flex flex-wrap gap-2 border-t pt-3">
              {views.map((view) => (
                <div
                  key={view.id}
                  className="bg-surface-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs"
                >
                  <span className="text-muted">{getStageMeta(view.id).shortLabel}</span>
                  <PassMark
                    hasResults={view.hasResults}
                    status={statusOf(stat.stageResults, view)}
                    showCount
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 桌面表格 */}
      <div className="bg-surface-1 border-border hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full min-w-150">
          <thead className="bg-surface-2 border-border border-b">
            <tr className="text-muted border-border border-b text-left text-xs">
              <th className="w-12 px-4 py-3">#</th>
              <th className="px-4 py-3 text-nowrap">竞猜者</th>
              <th className="px-4 py-3 text-center text-nowrap">猜对个数</th>
              <th className="px-4 py-3 text-center text-nowrap">任务通过</th>
              {views.map((view) => (
                <th key={view.id} className="px-4 py-3 text-center text-nowrap">
                  {getStageMeta(view.id).shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {stats.map((stat, index) => (
              <tr key={stat.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${rankTone(index)}`}>{index + 1}</span>
                </td>
                <td className="px-4 py-3">
                  <PredictorIdentity predictor={stat} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-primary font-semibold">{stat.totalCorrect}</span>
                  <span className="text-muted text-xs">/{stat.totalPredictions}</span>
                </td>
                <td className="text-muted px-4 py-3 text-center">
                  {stat.totalPassed}/{stat.totalStages}
                </td>
                {views.map((view) => (
                  <td key={view.id} className="px-4 py-3 text-center">
                    <PassMark
                      hasResults={view.hasResults}
                      status={statusOf(stat.stageResults, view)}
                      showCount
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted mt-4 text-center text-sm">更多数据正在持续整理中，敬请期待 ✨</p>
    </div>
  )
}
