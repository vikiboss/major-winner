'use client'

import Link from 'next/link'
import {
  events,
  getAllPredictorStats,
  getEventProgress,
  getEventStatusText,
  isPredictionPossible,
  getPredictorPrediction,
} from '@/lib/data'
import TeamLogo from '@/components/TeamLogo'
import type { StagePrediction } from '@/types'
import { useState } from 'react'

export default function LeaderboardPage() {
  const event = events[0]
  const stats = getAllPredictorStats(event.id)
  const eventProgress = getEventProgress(event)

  // 检查是否有足够的数据显示排行榜
  const hasEnoughData = eventProgress.canShowLeaderboard && stats.length > 0

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-primary mb-2 text-2xl font-semibold sm:text-3xl">竞猜排行</h1>
        <div className="mt-2 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <p className="text-muted">按猜对数排名 · {stats.length} 位竞猜者</p>
          <span className="text-muted hidden sm:inline">·</span>
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
            <span className="text-secondary">{getEventStatusText(eventProgress.eventStatus)}</span>
          </div>
        </div>
        <p className="text-muted mt-3 text-xs sm:text-sm">
          <span className="text-tertiary">通过规则：</span>瑞士轮 5/10，八进四 2/4，半决赛
          1/2，决赛猜中冠军
        </p>
      </div>

      {!hasEnoughData ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="bg-surface-1 border-border mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border">
              <span className="text-muted text-2xl">📊</span>
            </div>
            <h3 className="text-primary mb-2 text-lg font-medium">暂无排行数据</h3>
            <p className="text-muted text-sm">至少需要完成一个阶段才能显示排行榜</p>
          </div>
        </div>
      ) : (
        <LeaderboardTable stats={stats} eventProgress={eventProgress} event={event} />
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
  event,
}: {
  stats: ReturnType<typeof getAllPredictorStats>
  eventProgress: ReturnType<typeof getEventProgress>
  event: (typeof events)[0]
}) {
  const [showDetails, setShowDetails] = useState(false)

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
    <>
      {/* 表格头部控制栏 */}
      <div className="bg-surface-1 border-border mb-4 flex items-center justify-between rounded-lg border px-4 py-3">
        <h3 className="text-secondary text-sm font-medium">竞猜记录</h3>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
            className="text-primary-500 focus:ring-primary-500 h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-700 focus:ring-2 focus:ring-offset-0"
          />
          <span className="text-secondary text-sm">显示详细竞猜</span>
        </label>
      </div>

      {showDetails ? (
        <DetailedPredictionsView stats={stats} allStages={allStages} event={event} />
      ) : (
        <SummaryView stats={stats} allStages={allStages} />
      )}
    </>
  )
}

// 总览视图(原有的表格)
function SummaryView({
  stats,
  allStages,
}: {
  stats: ReturnType<typeof getAllPredictorStats>
  allStages: Array<{
    id: string
    hasResults: boolean
    isResultsComplete: boolean
    status: string
  }>
}) {
  return (
    <>
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
                  <Link
                    href={`/predictors/${encodeURIComponent(stat.id)}`}
                    className="hover:text-primary-400 text-primary block font-medium transition-colors"
                  >
                    {stat.name}
                  </Link>
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
                          ? '八强'
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
                            {result.passed ? '✓' : '✗'}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )
                      ) : result ? (
                        <span className="text-muted">
                          {result.correctCount}/{result.requiredCount}
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
          <thead>
            <tr className="border-border text-muted border-b text-left text-xs">
              <th className="w-12 px-4 py-3">#</th>
              <th className="px-4 py-3">竞猜者</th>
              <th className="px-4 py-3 text-center">猜对个数</th>
              <th className="px-4 py-3 text-center">任务通过</th>
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
                  <Link
                    href={`/predictors/${encodeURIComponent(stat.id)}`}
                    className="hover:text-primary-400 transition-colors"
                  >
                    <span className="text-primary font-medium">{stat.name}</span>
                    {stat.platform && (
                      <span className="text-muted ml-2 text-xs">@{stat.platform}</span>
                    )}
                  </Link>
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
    </>
  )
}

// 详细视图(参考首页布局,显示每个竞猜者的详细竞猜记录)
function DetailedPredictionsView({
  stats,
  allStages,
  event,
}: {
  stats: ReturnType<typeof getAllPredictorStats>
  allStages: Array<{
    id: string
    hasResults: boolean
    isResultsComplete: boolean
    status: string
  }>
  event: (typeof events)[0]
}) {
  return (
    <div className="space-y-6">
      {stats.map((stat, index) => (
        <div key={stat.name} className="bg-surface-1 border-border rounded-lg border">
          {/* 竞猜者信息头部 */}
          <div className="border-border border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`text-lg font-bold ${
                    index === 0 ? 'text-primary-400' : index < 3 ? 'text-secondary' : 'text-muted'
                  }`}
                >
                  #{index + 1}
                </span>
                <Link
                  href={`/predictors/${encodeURIComponent(stat.id)}`}
                  className="hover:text-primary-400 transition-colors"
                >
                  <span className="text-primary font-medium">{stat.name}</span>
                  {stat.platform && (
                    <span className="text-muted ml-2 text-xs">@{stat.platform}</span>
                  )}
                </Link>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-primary font-semibold">{stat.totalCorrect}</span>
                  <span className="text-muted text-xs">/{stat.totalPredictions}</span>
                </div>
                <div className="text-muted">
                  通过 {stat.totalPassed}/{stat.totalStages}
                </div>
              </div>
            </div>
          </div>

          {/* 各阶段详细竞猜记录 - 按决赛、阶段3、2、1倒序显示,且只显示已开始的阶段 */}
          <div className="divide-border divide-y">
            {allStages
              .filter((stage) => stage.hasResults) // 只显示有结果的阶段(已开始)
              .toReversed() // 倒序:决赛 → 3 → 2 → 1
              .map((stage) => {
                const result = stat.stageResults.find((s) => s.stageId === stage.id)

                const stageName =
                  stage.id === 'stage-1'
                    ? '第一阶段'
                    : stage.id === 'stage-2'
                      ? '第二阶段'
                      : stage.id === 'stage-3'
                        ? '第三阶段'
                        : stage.id === '8-to-4'
                          ? '八强'
                          : stage.id === '4-to-2'
                            ? '半决赛'
                            : '决赛'

                return (
                  <StagePredictionDetail
                    key={stage.id}
                    stageId={stage.id}
                    stageName={stageName}
                    stage={stage}
                    result={result}
                    event={event}
                    predictorId={stat.id}
                  />
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

// 单个阶段的详细竞猜记录
function StagePredictionDetail({
  stageId,
  stageName,
  stage,
  result,
  event,
  predictorId,
}: {
  stageId: string
  stageName: string
  stage: {
    id: string
    hasResults: boolean
    isResultsComplete: boolean
    status: string
  }
  result?: {
    stageId: string
    correctCount: number
    requiredCount: number
    passed: boolean
  }
  event: (typeof events)[0]
  predictorId: string
}) {
  const isSwiss = stageId.startsWith('stage-')
  const isFinals = ['8-to-4', '4-to-2', '2-to-1'].includes(stageId)

  // 获取瑞士轮的实际结果
  const stageData = isSwiss ? event[stageId as 'stage-1' | 'stage-2' | 'stage-3'] : null
  const actualResult = stageData?.result

  // 获取该竞猜者的所有竞猜数据
  const predictorData = getPredictorPrediction(event.id, predictorId)

  // 获取当前阶段的竞猜
  const prediction = predictorData
    ? isSwiss
      ? predictorData[stageId as 'stage-1' | 'stage-2' | 'stage-3']
      : isFinals
        ? predictorData.finals
        : null
    : null

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-secondary text-sm font-medium">{stageName}</span>
        {result && (
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              stage.isResultsComplete
                ? result.passed
                  ? 'bg-win/10 text-win'
                  : 'bg-lose/10 text-lose'
                : 'bg-surface-2 text-muted'
            }`}
          >
            {stage.isResultsComplete
              ? result.passed
                ? '通过'
                : '未通过'
              : `${result.correctCount}/${result.requiredCount}`}
          </span>
        )}
      </div>

      {/* 瑞士轮详细竞猜 */}
      {isSwiss && prediction && (
        <div className="space-y-2 text-xs">
          {/* 3-0 预测 */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-muted w-12 shrink-0 font-medium">3-0</span>
            <div className="flex flex-wrap gap-1">
              {(prediction as StagePrediction)['3-0'].map((team) => {
                const possible = !stage.hasResults
                  ? true
                  : isPredictionPossible(team, '3-0', actualResult)
                const isCorrect = stage.hasResults && actualResult?.['3-0']?.includes(team)
                return (
                  <span
                    key={team}
                    className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                      !stage.hasResults
                        ? 'bg-surface-2 text-tertiary'
                        : isCorrect
                          ? 'bg-win/10 text-win font-medium'
                          : !possible
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

          {/* 3-1/2 预测 */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-muted w-12 shrink-0 font-medium">3-1/2</span>
            <div className="flex flex-wrap gap-1">
              {(prediction as StagePrediction)['3-1-or-3-2'].map((team) => {
                const possible = !stage.hasResults
                  ? true
                  : isPredictionPossible(team, '3-1-or-3-2', actualResult)
                const isCorrect =
                  stage.hasResults &&
                  (actualResult?.['3-1']?.includes(team) || actualResult?.['3-2']?.includes(team))
                return (
                  <span
                    key={team}
                    className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                      !stage.hasResults
                        ? 'bg-surface-2 text-tertiary'
                        : isCorrect
                          ? 'bg-win/10 text-win font-medium'
                          : !possible
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

          {/* 0-3 预测 */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-muted w-12 shrink-0 font-medium">0-3</span>
            <div className="flex flex-wrap gap-1">
              {(prediction as StagePrediction)['0-3'].map((team) => {
                const possible = !stage.hasResults
                  ? true
                  : isPredictionPossible(team, '0-3', actualResult)
                const isCorrect = stage.hasResults && actualResult?.['0-3']?.includes(team)
                return (
                  <span
                    key={team}
                    className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
                      !stage.hasResults
                        ? 'bg-surface-2 text-tertiary'
                        : isCorrect
                          ? 'bg-win/10 text-win font-medium'
                          : !possible
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
      )}

      {/* 决赛阶段竞猜 */}
      {isFinals && prediction && (
        <div className="text-xs">
          {(stageId === '8-to-4' || stageId === '4-to-2') && (
            <div className="flex flex-wrap gap-1">
              <span className="text-muted">竞猜晋级: </span>
              {(prediction as { '8-to-4': string[]; '4-to-2': string[] })[
                stageId as '8-to-4' | '4-to-2'
              ].map((team) => {
                const roundResult = event.finals?.result[stageId as '8-to-4' | '4-to-2']
                const hasResult =
                  roundResult && 'winners' in roundResult && roundResult.winners.length > 0
                const isCorrect = hasResult && roundResult.winners.includes(team)
                return (
                  <span
                    key={team}
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
                      !stage.hasResults
                        ? 'bg-surface-2 text-tertiary'
                        : isCorrect
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
              })}
            </div>
          )}
          {stageId === '2-to-1' && (
            <div className="flex items-center gap-1">
              <span className="text-muted">冠军竞猜: </span>
              {(prediction as { '2-to-1': string | null })['2-to-1'] ? (
                <span
                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
                    !stage.hasResults
                      ? 'bg-surface-2 text-tertiary'
                      : event.finals?.result['2-to-1'].winner
                        ? (prediction as { '2-to-1': string | null })['2-to-1'] ===
                          event.finals.result['2-to-1'].winner
                          ? 'bg-win/10 text-win font-medium'
                          : 'bg-lose/10 text-lose'
                        : 'bg-surface-2 text-tertiary'
                  }`}
                >
                  <TeamLogo
                    shortName={(prediction as { '2-to-1': string | null })['2-to-1']!}
                    size="xs"
                  />
                  {(prediction as { '2-to-1': string | null })['2-to-1']}
                </span>
              ) : (
                <span className="text-tertiary">未竞猜</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 如果没有竞猜数据 */}
      {!prediction && <p className="text-muted text-xs">未参与此阶段竞猜</p>}
    </div>
  )
}
