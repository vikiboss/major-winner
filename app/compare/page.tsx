'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  events,
  getEventPredictions,
  calculatePredictorStats,
  getStageName,
  shouldShowStage,
  isPredictionPossible,
  getEventProgress,
} from '../../lib/data'

export default function ComparePage() {
  const event = events[0]
  const eventPreds = getEventPredictions(event.id)
  const predictors = eventPreds?.predictions || []

  const [selected, setSelected] = useState<string[]>(predictors.slice(0, 2).map((p) => p.predictor))

  const togglePredictor = (name: string) => {
    if (selected.includes(name)) {
      setSelected(selected.filter((s) => s !== name))
    } else {
      if (selected.length < 5) {
        setSelected([...selected, name])
      }
    }
  }

  const selectedPredictions = predictors.filter((p) => selected.includes(p.predictor))

  const selectedStats = selectedPredictions.map((p) => ({
    prediction: p,
    stats: calculatePredictorStats(event.id, p.predictor),
  }))

  // 获取应该显示的阶段列表（从决赛到瑞士轮的顺序）
  const visibleStages = ['2-to-1', '4-to-2', '8-to-4', 'stage-3', 'stage-2', 'stage-1'].filter(
    (stageId) => shouldShowStage(event, stageId),
  )

  // 获取赛事进度信息
  const eventProgress = getEventProgress(event)

  // 判断某个阶段是否已完成
  const isStageCompleted = (stageId: string) => {
    const stageProgress = eventProgress.stagesProgress.find((s) => s.stageId === stageId)
    return stageProgress?.status === 'completed'
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">竞猜对比</h1>
        <p className="text-muted text-md mb-6 space-y-1">
          选择 0-5 位竞猜者。<span className="text-zinc-400">通过规则：</span>瑞士轮 5/10，八进四
          2/4，半决赛 1/2，决赛猜中冠军
        </p>
      </div>

      {/* Selection */}
      <div className="bg-surface-1 border-border mb-6 rounded-lg border p-4">
        <div className="flex flex-wrap gap-2">
          {predictors.map((p) => (
            <button
              key={p.predictor}
              onClick={() => togglePredictor(p.predictor)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                selected.includes(p.predictor)
                  ? 'bg-primary-500 text-zinc-900 dark:text-white'
                  : 'bg-surface-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {p.predictor}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-surface-1 border-border mb-6 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-border text-muted border-b text-left text-xs">
              <th className="px-4 py-3">竞猜任务</th>
              {selectedStats.map(({ prediction }) => (
                <th key={prediction.predictor} className="px-4 py-3 text-center text-white">
                  <Link
                    href={`/predictors/${encodeURIComponent(prediction.predictor)}`}
                    className="hover:text-primary-400"
                  >
                    {prediction.predictor}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y text-sm">
            <tr>
              <td className="text-muted px-4 py-3">猜对</td>
              {selectedStats.map(({ prediction, stats }) => {
                const best = Math.max(...selectedStats.map((s) => s.stats?.totalCorrect || 0))
                return (
                  <td
                    key={prediction.predictor}
                    className={`px-4 py-3 text-center font-semibold ${
                      stats?.totalCorrect === best ? 'text-primary-400' : 'text-white'
                    }`}
                  >
                    {stats?.totalCorrect}
                    <span className="text-muted font-normal">/{stats?.totalPredictions}</span>
                  </td>
                )
              })}
            </tr>
            <tr>
              <td className="text-muted px-4 py-3">通过</td>
              {selectedStats.map(({ prediction, stats }) => (
                <td key={prediction.predictor} className="px-4 py-3 text-center text-white">
                  {stats?.totalPassed}/{stats?.totalStages}
                </td>
              ))}
            </tr>
            {visibleStages.map((stageId) => {
              const completed = isStageCompleted(stageId)
              return (
                <tr key={stageId}>
                  <td className="text-muted px-4 py-3">{getStageName(stageId)}</td>
                  {selectedStats.map(({ prediction, stats }) => {
                    const result = stats?.stageResults.find((s) => s.stageId === stageId)
                    return (
                      <td key={prediction.predictor} className="px-4 py-3 text-center">
                        {result ? (
                          completed ? (
                            <span className={result.passed ? 'text-win' : 'text-lose'}>
                              {result.passed ? '✓' : '✗'}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">
                              {result.correctCount}/{result.requiredCount}
                            </span>
                          )
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Finals */}
      {event.finals && shouldShowStage(event, '8-to-4') && (
        <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
          <div className="border-border border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-white">决赛阶段</h3>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border text-muted border-b text-xs">
                <th className="px-4 py-2 text-left">轮次</th>
                {selectedStats.map(({ prediction }) => (
                  <th key={prediction.predictor} className="px-4 py-2 text-center">
                    {prediction.predictor}
                  </th>
                ))}
                <th className="px-4 py-2 text-center">实际</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {/* 8-to-4 和 4-to-2 */}
              {(['8-to-4', '4-to-2'] as const)
                .filter((round) => shouldShowStage(event, round))
                .map((round) => {
                  const actualResult = event.finals!.result[round]
                  const actualWinners = actualResult.winners
                  const roundCompleted = isStageCompleted(round)
                  const hasResult = actualWinners.length > 0
                  return (
                    <tr key={round}>
                      <td className="text-muted px-4 py-2">{getStageName(round)}</td>
                      {selectedStats.map(({ prediction }) => {
                        const roundPred = prediction.finals?.[round]
                        return (
                          <td key={prediction.predictor} className="px-4 py-2 text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {roundPred?.map((team) => {
                                const isCorrect = actualWinners.includes(team)
                                return (
                                  <span
                                    key={team}
                                    className={`rounded px-1.5 py-0.5 text-xs ${
                                      roundCompleted
                                        ? isCorrect
                                          ? 'bg-win/10 text-win'
                                          : 'bg-lose/10 text-lose'
                                        : isCorrect
                                          ? 'bg-win/10 text-win'
                                          : hasResult
                                            ? 'bg-lose/10 text-lose'
                                            : 'bg-surface-2 text-zinc-400'
                                    }`}
                                  >
                                    {team}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                        )
                      })}
                      <td className="text-muted px-4 py-2 text-center text-xs">
                        {actualWinners.join(', ') || '-'}
                      </td>
                    </tr>
                  )
                })}
              {/* 2-to-1 冠军 */}
              {shouldShowStage(event, '2-to-1') &&
                (() => {
                  const championResult = event.finals!.result['2-to-1']
                  const actualWinner = championResult.winner
                  const roundCompleted = isStageCompleted('2-to-1')
                  const hasResult = !!actualWinner
                  return (
                    <tr>
                      <td className="text-muted px-4 py-2">{getStageName('2-to-1')}</td>
                      {selectedStats.map(({ prediction }) => {
                        const championPred = prediction.finals?.['2-to-1']
                        return (
                          <td key={prediction.predictor} className="px-4 py-2 text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {championPred && (
                                <span
                                  className={`rounded px-1.5 py-0.5 text-xs ${
                                    roundCompleted
                                      ? championPred === actualWinner
                                        ? 'bg-win/10 text-win'
                                        : 'bg-lose/10 text-lose'
                                      : championPred === actualWinner
                                        ? 'bg-win/10 text-win'
                                        : hasResult
                                          ? 'bg-lose/10 text-lose'
                                          : 'bg-surface-2 text-zinc-400'
                                  }`}
                                >
                                  {championPred}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="text-muted px-4 py-2 text-center text-xs">
                        {actualWinner || '-'}
                      </td>
                    </tr>
                  )
                })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Stage Details */}
      {(['stage-3', 'stage-2', 'stage-1'] as const).map((stageKey) => {
        const stageResult = event[stageKey]
        if (!stageResult || !shouldShowStage(event, stageKey)) return null

        const completed = isStageCompleted(stageKey)
        const stageProgress = eventProgress.stagesProgress.find((s) => s.stageId === stageKey)

        return (
          <div
            key={stageKey}
            className="bg-surface-1 border-border mb-4 overflow-hidden rounded-lg border"
          >
            <div className="border-border border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-white">{getStageName(stageKey)}</h3>
                {stageProgress && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      stageProgress.status === 'completed'
                        ? 'bg-win/10 text-win'
                        : stageProgress.status === 'in_progress'
                          ? 'bg-primary-500/10 text-primary-400 animate-pulse'
                          : 'bg-yellow-500/10 text-yellow-400'
                    }`}
                  >
                    {stageProgress.status === 'completed'
                      ? '已完成'
                      : stageProgress.status === 'in_progress'
                        ? '进行中'
                        : '等待比赛'}
                  </span>
                )}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted border-b text-xs">
                  <th className="px-4 py-2 text-left text-nowrap">竞猜项</th>
                  <th className="px-4 py-2 text-center">实际</th>
                  {selectedStats.map(({ prediction }) => (
                    <th key={prediction.predictor} className="px-4 py-2 text-center text-nowrap">
                      {prediction.predictor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                <tr>
                  <td className="text-win px-4 py-2">3-0</td>
                  <td className="text-muted px-4 py-2 text-center text-xs">
                    {completed ? (
                      stageResult.result['3-0']?.join(', ') || '-'
                    ) : (
                      <div className="space-y-1">
                        {(stageResult.result['2-0']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">2-0:</span>{' '}
                            {stageResult.result['2-0']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['1-0']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">1-0:</span>{' '}
                            {stageResult.result['1-0']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['2-0']?.length ?? 0) === 0 &&
                          (stageResult.result['1-0']?.length ?? 0) === 0 &&
                          '-'}
                      </div>
                    )}
                  </td>
                  {selectedStats.map(({ prediction }) => {
                    const stagePred = prediction[stageKey]
                    return (
                      <td key={prediction.predictor} className="px-4 py-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {stagePred?.['3-0'].map((team) => {
                            const isCorrect = stageResult.result['3-0'].includes(team)
                            const isPossible = isPredictionPossible(team, '3-0', stageResult.result)
                            return (
                              <span
                                key={team}
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  completed
                                    ? isCorrect
                                      ? 'bg-win/10 text-win'
                                      : 'bg-lose/10 text-lose'
                                    : isCorrect
                                      ? 'bg-win/10 text-win'
                                      : !isPossible
                                        ? 'bg-lose/10 text-lose line-through opacity-60'
                                        : 'bg-surface-2 text-zinc-400'
                                }`}
                              >
                                {team}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td className="text-primary-400 px-4 py-2 text-nowrap">3-1/2</td>
                  <td className="text-muted px-4 py-2 text-center text-xs">
                    {completed ? (
                      [
                        ...(stageResult.result['3-1'] || []),
                        ...(stageResult.result['3-2'] || []),
                      ].join(', ') || '-'
                    ) : (
                      <div className="space-y-1">
                        {(stageResult.result['2-1']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">2-1:</span>{' '}
                            {stageResult.result['2-1']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['2-2']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">2-2:</span>{' '}
                            {stageResult.result['2-2']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['1-1']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">1-1:</span>{' '}
                            {stageResult.result['1-1']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['1-2']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">1-2:</span>{' '}
                            {stageResult.result['1-2']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['2-1']?.length ?? 0) === 0 &&
                          (stageResult.result['2-2']?.length ?? 0) === 0 &&
                          (stageResult.result['1-1']?.length ?? 0) === 0 &&
                          (stageResult.result['1-2']?.length ?? 0) === 0 &&
                          '-'}
                      </div>
                    )}
                  </td>
                  {selectedStats.map(({ prediction }) => {
                    const stagePred = prediction[stageKey]
                    return (
                      <td key={prediction.predictor} className="px-4 py-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {stagePred?.['3-1-or-3-2'].map((team) => {
                            const isCorrect =
                              stageResult.result['3-1'].includes(team) ||
                              stageResult.result['3-2'].includes(team)
                            const isPossible = isPredictionPossible(
                              team,
                              '3-1-or-3-2',
                              stageResult.result,
                            )
                            return (
                              <span
                                key={team}
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  completed
                                    ? isCorrect
                                      ? 'bg-win/10 text-win'
                                      : 'bg-lose/10 text-lose'
                                    : isCorrect
                                      ? 'bg-win/10 text-win'
                                      : !isPossible
                                        ? 'bg-lose/10 text-lose line-through opacity-60'
                                        : 'bg-surface-2 text-zinc-400'
                                }`}
                              >
                                {team}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td className="text-lose px-4 py-2">0-3</td>
                  <td className="text-muted px-4 py-2 text-center text-xs">
                    {completed ? (
                      stageResult.result['0-3']?.join(', ') || '-'
                    ) : (
                      <div className="space-y-1">
                        {(stageResult.result['0-2']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">0-2:</span>{' '}
                            {stageResult.result['0-2']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['0-1']?.length ?? 0) > 0 && (
                          <div>
                            <span className="text-primary-400 font-medium">0-1:</span>{' '}
                            {stageResult.result['0-1']?.join(', ')}
                          </div>
                        )}
                        {(stageResult.result['0-2']?.length ?? 0) === 0 &&
                          (stageResult.result['0-1']?.length ?? 0) === 0 &&
                          '-'}
                      </div>
                    )}
                  </td>
                  {selectedStats.map(({ prediction }) => {
                    const stagePred = prediction[stageKey]
                    return (
                      <td key={prediction.predictor} className="px-4 py-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {stagePred?.['0-3'].map((team) => {
                            const isCorrect = stageResult.result['0-3'].includes(team)
                            const isPossible = isPredictionPossible(team, '0-3', stageResult.result)
                            return (
                              <span
                                key={team}
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  completed
                                    ? isCorrect
                                      ? 'bg-win/10 text-win'
                                      : 'bg-lose/10 text-lose'
                                    : isCorrect
                                      ? 'bg-win/10 text-win'
                                      : !isPossible
                                        ? 'bg-lose/10 text-lose line-through opacity-60'
                                        : 'bg-surface-2 text-zinc-400'
                                }`}
                              >
                                {team}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
