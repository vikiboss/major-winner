'use client'

import { useState } from 'react'
import Link from 'next/link'
import { events, getEventPredictions, calculatePredictorStats, getStageName } from '../../lib/data'

export default function ComparePage() {
  const event = events[0]
  const eventPreds = getEventPredictions(event.id)
  const predictors = eventPreds?.predictions || []

  const [selected, setSelected] = useState<string[]>(predictors.slice(0, 2).map((p) => p.predictor))

  const togglePredictor = (name: string) => {
    if (selected.includes(name)) {
      if (selected.length > 2) {
        setSelected(selected.filter((s) => s !== name))
      }
    } else {
      if (selected.length < 4) {
        setSelected([...selected, name])
      }
    }
  }

  const selectedPredictions = predictors.filter((p) => selected.includes(p.predictor))

  const selectedStats = selectedPredictions.map((p) => ({
    prediction: p,
    stats: calculatePredictorStats(event.id, p.predictor),
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">竞猜对比</h1>
        <p className="text-muted mt-1 text-sm">选择 2-4 位竞猜者</p>
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
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-2 text-zinc-400 hover:text-white'
              }`}
            >
              {p.predictor}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-surface-1 border-border mb-6 overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-border text-muted border-b text-left text-xs">
              <th className="px-4 py-3">指标</th>
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
            {['stage-1', 'stage-2', 'stage-3', '8-to-4', '4-to-2', '2-to-1'].map((stageId) => (
              <tr key={stageId}>
                <td className="text-muted px-4 py-3">{getStageName(stageId)}</td>
                {selectedStats.map(({ prediction, stats }) => {
                  const result = stats?.stageResults.find((s) => s.stageId === stageId)
                  return (
                    <td key={prediction.predictor} className="px-4 py-3 text-center">
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

      {/* Stage Details */}
      {(['stage-1', 'stage-2', 'stage-3'] as const).map((stageKey) => {
        const stageResult = event[stageKey]
        if (!stageResult) return null

        return (
          <div
            key={stageKey}
            className="bg-surface-1 border-border mb-4 overflow-hidden rounded-lg border"
          >
            <div className="border-border border-b px-4 py-3">
              <h3 className="font-medium text-white">{getStageName(stageKey)}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted border-b text-xs">
                  <th className="px-4 py-2 text-left">竞猜项</th>
                  {selectedStats.map(({ prediction }) => (
                    <th key={prediction.predictor} className="px-4 py-2 text-center">
                      {prediction.predictor}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center">实际</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                <tr>
                  <td className="text-win px-4 py-2">3-0</td>
                  {selectedStats.map(({ prediction }) => {
                    const stagePred = prediction[stageKey]
                    return (
                      <td key={prediction.predictor} className="px-4 py-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {stagePred?.['3-0'].map((team) => {
                            // 精确匹配:竞猜 3-0 必须实际也是 3-0
                            const isCorrect = stageResult.result['3-0'].includes(team)
                            return (
                              <span
                                key={team}
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  isCorrect ? 'bg-win/10 text-win' : 'bg-lose/10 text-lose'
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
                    {stageResult.result['3-0'].join(', ')}
                  </td>
                </tr>
                <tr>
                  <td className="text-primary-400 px-4 py-2">3-1/2</td>
                  {selectedStats.map(({ prediction }) => {
                    const stagePred = prediction[stageKey]
                    return (
                      <td key={prediction.predictor} className="px-4 py-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {stagePred?.['3-1-or-3-2'].map((team) => {
                            // 精确匹配:竞猜 3-1/3-2 必须实际也是 3-1 或 3-2
                            const isCorrect =
                              stageResult.result['3-1'].includes(team) ||
                              stageResult.result['3-2'].includes(team)
                            return (
                              <span
                                key={team}
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  isCorrect ? 'bg-win/10 text-win' : 'bg-lose/10 text-lose'
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
                    {[...stageResult.result['3-1'], ...stageResult.result['3-2']].join(', ')}
                  </td>
                </tr>
                <tr>
                  <td className="text-lose px-4 py-2">0-3</td>
                  {selectedStats.map(({ prediction }) => {
                    const stagePred = prediction[stageKey]
                    return (
                      <td key={prediction.predictor} className="px-4 py-2 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {stagePred?.['0-3'].map((team) => {
                            // 精确匹配:竞猜 0-3 必须实际也是 0-3
                            const isCorrect = stageResult.result['0-3'].includes(team)
                            return (
                              <span
                                key={team}
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  isCorrect ? 'bg-win/10 text-win' : 'bg-lose/10 text-lose'
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
                    {stageResult.result['0-3'].join(', ')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })}

      {/* Finals */}
      {event.finals && (
        <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
          <div className="border-border border-b px-4 py-3">
            <h3 className="font-medium text-white">决赛阶段</h3>
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
              {(['8-to-4', '4-to-2'] as const).map((round) => {
                const actualResult = event.finals!.result[round]
                const actualWinners = actualResult.winners
                return (
                  <tr key={round}>
                    <td className="text-muted px-4 py-2">{getStageName(round)}</td>
                    {selectedStats.map(({ prediction }) => {
                      const roundPred = prediction.finals?.[round]
                      return (
                        <td key={prediction.predictor} className="px-4 py-2 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {roundPred?.map((team) => (
                              <span
                                key={team}
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                  actualWinners.includes(team)
                                    ? 'bg-win/10 text-win'
                                    : 'bg-lose/10 text-lose'
                                }`}
                              >
                                {team}
                              </span>
                            ))}
                          </div>
                        </td>
                      )
                    })}
                    <td className="text-muted px-4 py-2 text-center text-xs">
                      {actualWinners.join(', ')}
                    </td>
                  </tr>
                )
              })}
              {/* 2-to-1 冠军 */}
              {(() => {
                const championResult = event.finals!.result['2-to-1']
                const actualWinner = championResult.winner
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
                                  championPred === actualWinner
                                    ? 'bg-win/10 text-win'
                                    : 'bg-lose/10 text-lose'
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
    </div>
  )
}
