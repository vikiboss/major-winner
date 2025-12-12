import {
  STAGE_GROUP_NAME_MAP,
  SWISS_PROGRESS_RECORDS,
  SWISS_RESULT_LOSE_RECORDS,
  SWISS_RESULT_WIN_RECORDS,
  SWISS_STAGES,
} from './constants'

import type { MajorEvent } from '@/types'

export type TeamPerformanceStatus =
  | 'advanced'
  | 'eliminated'
  | 'champion'
  | 'in-progress'
  | 'waiting'

export interface TeamPerformanceRecord {
  stage: string
  stageName: string
  result: string
  status: TeamPerformanceStatus
}

export function getTeamPerformance(event: MajorEvent, shortName: string): TeamPerformanceRecord[] {
  const performance: TeamPerformanceRecord[] = []

  // 检查瑞士轮阶段
  for (const stageKey of SWISS_STAGES) {
    const stage = event[stageKey]

    if (!stage) continue

    const stageName = STAGE_GROUP_NAME_MAP[stageKey]

    const { result } = stage

    // 检查该队伍是否在本阶段参赛
    const isInStage =
      stage.teams.includes(shortName) || stage.teamsFromAdvanced?.includes(shortName)

    if (!isInStage) continue

    // 检查赛程中的战绩
    let foundInProgress = false
    for (const record of SWISS_PROGRESS_RECORDS) {
      if (result[record]?.includes(shortName)) {
        performance.push({ stage: stageKey, stageName, result: record, status: 'in-progress' })
        foundInProgress = true
        break
      }
    }

    if (foundInProgress) continue

    // 检查晋级结果
    let foundResult = false
    for (const record of SWISS_RESULT_WIN_RECORDS) {
      if (result[record].includes(shortName)) {
        performance.push({ stage: stageKey, stageName, result: record, status: 'advanced' })
        foundResult = true
        break
      }
    }

    if (foundResult) continue

    // 检查淘汰结果
    for (const record of SWISS_RESULT_LOSE_RECORDS) {
      if (result[record].includes(shortName)) {
        performance.push({ stage: stageKey, stageName, result: record, status: 'eliminated' })
        foundResult = true
        break
      }
    }

    // 如果在本阶段但没有任何结果,说明等待比赛
    if (!foundResult && !foundInProgress) {
      performance.push({ stage: stageKey, stageName, result: '待赛', status: 'waiting' })
    }
  }

  // 检查决胜阶段 - 只有真正在决赛名单中的队伍才显示决赛信息
  if (
    event.playoffs &&
    event.playoffs.teams.length > 0 &&
    event.playoffs.teams.includes(shortName)
  ) {
    const playoffs = event.playoffs

    if (playoffs.result['2-to-1'].winner === shortName) {
      performance.push({
        stage: 'playoffs',
        stageName: '决赛',
        result: '冠军',
        status: 'champion',
      })
    } else if (playoffs.result['2-to-1'].loser === shortName) {
      performance.push({
        stage: 'playoffs',
        stageName: '决赛',
        result: '亚军',
        status: 'advanced',
      })
    } else if (playoffs.result['4-to-2'].winners.includes(shortName)) {
      // 已经晋级决赛
      performance.push({
        stage: 'playoffs',
        stageName: '半决赛',
        result: '晋级决赛',
        status: 'advanced',
      })

      // 检查决赛是否已经开始(有队伍已经有决赛结果)
      const playoffsStarted =
        playoffs.result['2-to-1'].winner !== '' || playoffs.result['2-to-1'].loser !== ''
      if (playoffsStarted) {
        // 决赛已经开始,但没有这个队伍的结果,说明在等待比赛
        performance.push({
          stage: 'playoffs',
          stageName: '决赛',
          result: '待赛',
          status: 'waiting',
        })
      }
    } else if (playoffs.result['4-to-2'].losers.includes(shortName)) {
      performance.push({
        stage: 'playoffs',
        stageName: '半决赛',
        result: '四强',
        status: 'eliminated',
      })
    } else if (playoffs.result['8-to-4'].losers.includes(shortName)) {
      performance.push({
        stage: 'playoffs',
        stageName: '八进四',
        result: '八强',
        status: 'eliminated',
      })
    } else if (playoffs.result['8-to-4'].winners.includes(shortName)) {
      // 已经晋级四强
      performance.push({
        stage: 'playoffs',
        stageName: '八进四',
        result: '晋级四强',
        status: 'advanced',
      })

      // 检查四进二是否已经开始(有队伍已经有四进二结果)
      const semiplayoffsStarted =
        playoffs.result['4-to-2'].winners.length > 0 || playoffs.result['4-to-2'].losers.length > 0
      if (semiplayoffsStarted) {
        // 四进二已经开始,但没有这个队伍的结果,说明在等待比赛
        performance.push({
          stage: 'playoffs',
          stageName: '半决赛',
          result: '待赛',
          status: 'waiting',
        })
      }
    } else {
      // 在决赛名单中但还没有结果,说明等待八进四
      performance.push({
        stage: 'playoffs',
        stageName: '八进四',
        result: '待赛',
        status: 'waiting',
      })
    }
  }

  return performance
}

export function getTeamStatus(performances: TeamPerformanceRecord[]) {
  const lastPerf = performances[performances.length - 1]

  if (!lastPerf) return { text: '未开赛', className: 'text-muted' }
  if (lastPerf.status === 'champion')
    return { text: '🏆 冠军', className: 'text-primary-400 font-semibold' }
  if (lastPerf.status === 'in-progress') return { text: '赛程中', className: 'text-primary-400' }
  if (lastPerf.status === 'waiting') return { text: '等待中', className: 'text-muted' }
  if (lastPerf.status === 'advanced' && lastPerf.result === '亚军')
    return { text: '🥈 亚军', className: 'text-primary-300 font-semibold' }
  if (lastPerf.status === 'eliminated')
    return { text: `❌ 已淘汰 (${lastPerf.stageName})`, className: 'text-lose' }
  if (lastPerf.status === 'advanced') return { text: '已晋级', className: 'text-win' }

  return { text: '赛程中', className: 'text-muted' }
}

export function getSortedTeamsByPerformance(event: MajorEvent) {
  // 排序逻辑 - 实力越强越靠前:
  // 1. 决赛成绩优先: 冠军 > 亚军 > 四强 > 八强 > 未进决赛
  // 2. 实际达到的最高阶段: stage-3 > stage-2 > stage-1 (打入更高阶段 = 更强)
  // 3. 同阶段内比较战绩: 3-0 > 3-1 > 3-2 > 2-3 > 1-3 > 0-3
  // 4. 比赛状态: 晋级/赛程中 > 待赛 > 淘汰
  return event.teams
    .map((team) => {
      const performance = getTeamPerformance(event, team.shortName)
      return {
        ...team,
        performance,
        status: getTeamStatus(performance),
      }
    })
    .toSorted((a, b) => {
      const lastA = a.performance[a.performance.length - 1]
      const lastB = b.performance[b.performance.length - 1]

      const aStatus = lastA?.status || 'eliminated'
      const bStatus = lastB?.status || 'eliminated'

      // 优先考虑淘汰状态
      if (aStatus === 'eliminated' && bStatus !== 'eliminated') return 1
      if (aStatus !== 'eliminated' && bStatus === 'eliminated') return -1

      // 1. 决赛成绩 - 最强的证明
      const aPlayoffs = a.performance.find((p) => p.stage === 'playoffs')
      const bPlayoffs = b.performance.find((p) => p.stage === 'playoffs')

      // 进决赛的队伍一定强于未进决赛的
      if (aPlayoffs && !bPlayoffs) return -1
      if (!aPlayoffs && bPlayoffs) return 1

      // 决赛内部排序
      if (aPlayoffs && bPlayoffs) {
        const playoffsRank = {
          冠军: 1,
          亚军: 2,
          晋级决赛: 3,
          四强: 4,
          晋级四强: 5,
          八强: 6,
          待赛: 999,
        }
        const aRank = playoffsRank[aPlayoffs.result as keyof typeof playoffsRank] || 999
        const bRank = playoffsRank[bPlayoffs.result as keyof typeof playoffsRank] || 999
        if (aRank !== bRank) return aRank - bRank
      }

      // 2. 找到每支队伍实际达到的最高瑞士轮阶段
      const getHighestSwissStage = (perf: typeof a.performance) => {
        const swissPerfs = perf.filter(
          (p) => p.stage === 'stage-1' || p.stage === 'stage-2' || p.stage === 'stage-3',
        )
        if (swissPerfs.length === 0) return null
        // 返回最后一个瑞士轮阶段（即最高阶段）
        return swissPerfs[swissPerfs.length - 1]
      }

      const aHighestSwiss = getHighestSwissStage(a.performance)
      const bHighestSwiss = getHighestSwissStage(b.performance)

      // 3. 比较实际达到的最高阶段（打入冠军组一定强于只在传奇组）
      const stageStrength = {
        'stage-3': 1, // 冠军组
        'stage-2': 2, // 传奇组
        'stage-1': 3, // 挑战组
      }

      const aStageRank = aHighestSwiss
        ? stageStrength[aHighestSwiss.stage as keyof typeof stageStrength] || 999
        : 999
      const bStageRank = bHighestSwiss
        ? stageStrength[bHighestSwiss.stage as keyof typeof stageStrength] || 999
        : 999

      if (aStageRank !== bStageRank) return aStageRank - bStageRank

      // 4. 同阶段内比较战绩（同在冠军组时，3-0 > 1-3）
      const getSwissStrength = (perf: typeof lastA) => {
        if (!perf) return 999
        // 最终成绩: 3-0 最强,0-3 最弱
        const playoffScores = { '3-0': 1, '3-1': 2, '3-2': 3, '2-3': 4, '1-3': 5, '0-3': 6 }
        // 赛程中成绩: 按胜率排序 (2-0 > 2-1 > 1-0 > 2-2 > 1-1 > 0-1 > 1-2 > 0-2)
        // prettier-ignore
        const inProgressScores = { '2-0': 10, '2-1': 11, '1-0': 12, '2-2': 13, '1-1': 14, '0-1': 15, '1-2': 16, '0-2': 17 }

        const result = perf.result as string

        return (
          playoffScores[result as keyof typeof playoffScores] ||
          inProgressScores[result as keyof typeof inProgressScores] ||
          999
        )
      }

      // 同阶段内，比较该阶段的战绩
      if (aHighestSwiss && bHighestSwiss && aStageRank === bStageRank) {
        const aSwiss = getSwissStrength(aHighestSwiss)
        const bSwiss = getSwissStrength(bHighestSwiss)
        if (aSwiss !== bSwiss) return aSwiss - bSwiss
      }

      const statusStrength = {
        champion: 1, // 冠军最强
        advanced: 2, // 已晋级
        'in-progress': 3, // 赛程中 (可能晋级)
        waiting: 4, // 待赛
        eliminated: 5, // 已淘汰
      }

      // 5. 比赛状态 - 晋级/赛程中 > 待赛 > 淘汰
      const aStatusRank = statusStrength[aStatus] || 999
      const bStatusRank = statusStrength[bStatus] || 999

      if (aStatusRank !== bStatusRank) return aStatusRank - bStatusRank

      // 6. 默认按起始阶段排序 (高阶段起点 = 种子实力强)
      const startStageRank = stageStrength[a.stage as keyof typeof stageStrength] || 999
      const startStageRank2 = stageStrength[b.stage as keyof typeof stageStrength] || 999

      return startStageRank - startStageRank2
    })
}
