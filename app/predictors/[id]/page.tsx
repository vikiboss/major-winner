import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  events,
  getEventPredictions,
  calculatePredictorStats,
  getStageName,
  getPredictorPrediction,
  getEventProgress,
  shouldShowStageInPredictorDetail,
  hasStageResults,
} from '../../../lib/data'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const event = events[0]
  const eventPreds = getEventPredictions(event.id)
  if (!eventPreds) return []
  return eventPreds.predictions.map((p) => ({
    id: encodeURIComponent(p.predictor),
  }))
}

export default async function PredictorDetailPage({ params }: Props) {
  const { id } = await params
  const predictorName = decodeURIComponent(id)

  const event = events[0]
  const prediction = getPredictorPrediction(event.id, predictorName)
  const stats = calculatePredictorStats(event.id, predictorName)
  const eventProgress = getEventProgress(event)

  if (!prediction || !stats) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-muted mb-6 flex items-center gap-2 text-sm">
        <Link href="/" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
          首页
        </Link>
        <span>/</span>
        <Link href="/predictors" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
          竞猜者
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-white">{predictorName}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">{predictorName}</h1>
          {prediction.platform && <p className="text-muted mt-1 text-sm">{prediction.platform}</p>}
          {prediction.description && (
            <p className="text-muted mt-1 text-sm">{prediction.description}</p>
          )}
          {prediction.link && (
            <a
              href={prediction.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 mt-2 inline-block text-sm hover:underline"
            >
              查看竞猜链接 →
            </a>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {stats.totalCorrect}
              <span className="text-muted text-base">/{stats.totalPredictions}</span>
            </p>
            <p className="text-muted text-xs">猜对</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {stats.totalPassed}
              <span className="text-muted text-base">/{stats.totalStages}</span>
            </p>
            <p className="text-muted text-xs">通过</p>
          </div>
        </div>
      </div>

      {/* Predictions by Stage */}
      <div className="space-y-6">
        {/* Swiss Stages */}
        {(['stage-1', 'stage-2', 'stage-3'] as const).map((stageKey) => {
          const stagePred = prediction[stageKey]
          const stageResult = event[stageKey]
          const passStatus = stats.stageResults.find((s) => s.stageId === stageKey)

          // 只显示有竞猜数据的阶段
          if (!shouldShowStageInPredictorDetail(prediction, event, stageKey)) return null

          // 判断是否有比赛结果可以对比
          const showResults = hasStageResults(event, stageKey)

          // 只在有结果时计算实际晋级和淘汰队伍
          const actualAdvancing =
            showResults && stageResult
              ? [
                  ...stageResult.result['3-0'],
                  ...stageResult.result['3-1'],
                  ...stageResult.result['3-2'],
                ]
              : []
          const actualEliminated =
            showResults && stageResult
              ? [
                  ...stageResult.result['0-3'],
                  ...stageResult.result['1-3'],
                  ...stageResult.result['2-3'],
                ]
              : []

          // 获取阶段状态
          const stageProgress = eventProgress.stagesProgress.find((s) => s.stageId === stageKey)

          return (
            <div key={stageKey} className="bg-surface-1 border-border rounded-lg border">
              <div className="border-border flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium text-zinc-900 dark:text-white">{getStageName(stageKey)}</h2>
                  {stageProgress && stageProgress.status !== 'not_started' && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        stageProgress.status === 'completed'
                          ? 'bg-win/10 text-win'
                          : 'bg-primary-500/10 text-primary-400'
                      }`}
                    >
                      {stageProgress.status === 'completed' ? '已完成' : '进行中'}
                    </span>
                  )}
                  {!showResults && (
                    <span className="bg-surface-2 rounded px-2 py-0.5 text-xs font-medium text-zinc-400">
                      等待开赛
                    </span>
                  )}
                </div>
                {showResults && passStatus && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${passStatus.passed ? 'bg-win/10 text-win' : 'bg-lose/10 text-lose'}`}
                  >
                    {passStatus.details}
                  </span>
                )}
              </div>
              <div className="space-y-4 p-4">
                {/* 3-0 */}
                <div>
                  <p className="text-muted mb-2 text-xs">3-0 竞猜</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stagePred!['3-0'].map((team) => {
                      const isCorrect = showResults && stageResult?.result['3-0']?.includes(team)
                      const isWrong = showResults && !actualAdvancing.includes(team)
                      return (
                        <span
                          key={team}
                          className={`rounded px-2 py-1 text-xs ${
                            !showResults
                              ? 'bg-surface-2 text-zinc-300'
                              : isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : isWrong
                                  ? 'bg-lose/10 text-lose'
                                  : 'bg-surface-2 text-zinc-400'
                          }`}
                        >
                          {team}
                        </span>
                      )
                    })}
                  </div>
                </div>
                {/* 3-1/3-2 */}
                <div>
                  <p className="text-muted mb-2 text-xs">3-1/3-2 竞猜</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stagePred!['3-1-or-3-2'].map((team) => {
                      const isCorrect = showResults && (stageResult?.result['3-1']?.includes(team) || stageResult?.result['3-2']?.includes(team))
                      const isWrong = showResults && !actualAdvancing.includes(team)
                      return (
                        <span
                          key={team}
                          className={`rounded px-2 py-1 text-xs ${
                            !showResults
                              ? 'bg-surface-2 text-zinc-300'
                              : isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : isWrong
                                  ? 'bg-lose/10 text-lose'
                                  : 'bg-surface-2 text-zinc-400'
                          }`}
                        >
                          {team}
                        </span>
                      )
                    })}
                  </div>
                </div>
                {/* 0-3 */}
                <div>
                  <p className="text-muted mb-2 text-xs">0-3 竞猜</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stagePred!['0-3'].map((team) => {
                      const isCorrect = showResults && stageResult?.result['0-3']?.includes(team)
                      const isWrong = showResults && !actualEliminated.includes(team)
                      return (
                        <span
                          key={team}
                          className={`rounded px-2 py-1 text-xs ${
                            !showResults
                              ? 'bg-surface-2 text-zinc-300'
                              : isCorrect
                                ? 'bg-win/10 text-win font-medium'
                                : isWrong
                                  ? 'bg-lose/10 text-lose'
                                  : 'bg-surface-2 text-zinc-400'
                          }`}
                        >
                          {team}
                        </span>
                      )
                    })}
                  </div>
                </div>
                {/* Actual - 只在有结果时显示 */}
                {showResults && (actualAdvancing.length > 0 || actualEliminated.length > 0) && (
                  <div className="border-border text-muted border-t pt-3 text-xs">
                    <p>
                      实际晋级: {actualAdvancing.join(', ') || '无'}
                    </p>
                    <p>
                      实际淘汰: {actualEliminated.join(', ') || '无'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Finals */}
        {shouldShowStageInPredictorDetail(prediction, event, 'finals') &&
          (() => {
            const showFinalsResults = hasStageResults(event, 'finals')
            const finalsProgress = eventProgress.stagesProgress.find((s) => s.stageId === 'finals')
            return (
              <div key="finals" className="bg-surface-1 border-border rounded-lg border">
                <div className="border-border border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-zinc-900 dark:text-white">决赛阶段</h2>
                    {finalsProgress && finalsProgress.status !== 'not_started' && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          finalsProgress.status === 'completed'
                            ? 'bg-win/10 text-win'
                            : 'bg-primary-500/10 text-primary-400'
                        }`}
                      >
                        {finalsProgress.status === 'completed' ? '已完成' : '进行中'}
                      </span>
                    )}
                    {!showFinalsResults && (
                      <span className="bg-surface-2 rounded px-2 py-0.5 text-xs font-medium text-zinc-400">
                        等待开赛
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  {/* 8-to-4 和 4-to-2 */}
                  {(['8-to-4', '4-to-2'] as const).map((round) => {
                    const roundPred = prediction.finals?.[round]
                    const roundResult = event.finals?.result[round]
                    const passStatus = stats.stageResults.find((s) => s.stageId === round)

                    if (!roundPred) return null

                    return (
                      <div key={round}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-muted text-xs">{getStageName(round)}</p>
                          {showFinalsResults && passStatus && (
                            <span
                              className={`text-xs ${passStatus.passed ? 'text-win' : 'text-lose'}`}
                            >
                              {passStatus.details}
                            </span>
                          )}
                        </div>
                        <div className="mb-1 flex flex-wrap gap-1.5">
                          {roundPred.map((team) => (
                            <span
                              key={team}
                              className={`rounded px-2 py-1 text-xs ${
                                showFinalsResults && roundResult
                                  ? roundResult.winners.includes(team)
                                    ? 'bg-win/10 text-win'
                                    : 'bg-lose/10 text-lose'
                                  : 'bg-surface-2 text-zinc-300'
                              }`}
                            >
                              {team}
                            </span>
                          ))}
                        </div>
                        {showFinalsResults && roundResult && roundResult.winners.length > 0 && (
                          <p className="text-muted text-xs">
                            实际: {roundResult.winners.join(', ')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  {/* 2-to-1 冠军竞猜 */}
                  {prediction.finals?.['2-to-1'] && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-muted text-xs">{getStageName('2-to-1')}</p>
                        {showFinalsResults &&
                          stats.stageResults.find((s) => s.stageId === '2-to-1') && (
                            <span
                              className={`text-xs ${stats.stageResults.find((s) => s.stageId === '2-to-1')?.passed ? 'text-win' : 'text-lose'}`}
                            >
                              {stats.stageResults.find((s) => s.stageId === '2-to-1')?.details}
                            </span>
                          )}
                      </div>
                      <div className="mb-1 flex flex-wrap gap-1.5">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            showFinalsResults && event.finals?.result['2-to-1'].winner
                              ? prediction.finals['2-to-1'] === event.finals.result['2-to-1'].winner
                                ? 'bg-win/10 text-win'
                                : 'bg-lose/10 text-lose'
                              : 'bg-surface-2 text-zinc-300'
                          }`}
                        >
                          {prediction.finals['2-to-1']}
                        </span>
                      </div>
                      {showFinalsResults && event.finals?.result['2-to-1'].winner && (
                        <p className="text-muted text-xs">
                          实际: {event.finals.result['2-to-1'].winner}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
      </div>
    </div>
  )
}
