/**
 * 战队表现推导：把赛事结果折算成「每支队伍走到哪一步」。
 */

import {
  STAGE_META,
  SWISS_PROGRESS_RECORDS,
  SWISS_RESULT_LOSE_RECORDS,
  SWISS_RESULT_WIN_RECORDS,
  SWISS_STAGES,
} from './constants'

import type { MajorEvent, Team } from '@/types'

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

/** 队伍状态文案的语义色调，具体样式由组件决定 */
export type TeamTone =
  | 'champion'
  | 'runner-up'
  | 'advanced'
  | 'in-progress'
  | 'waiting'
  | 'eliminated'
  | 'idle'

export interface TeamStatus {
  text: string
  tone: TeamTone
}

/* -------------------------------------------------------------------------- */
/*                                瑞士轮战绩                                   */
/* -------------------------------------------------------------------------- */

function getSwissPerformance(event: MajorEvent, shortName: string): TeamPerformanceRecord[] {
  const records: TeamPerformanceRecord[] = []

  for (const stageId of SWISS_STAGES) {
    const stage = event[stageId]
    if (!stage) continue

    const participates =
      stage.teams.includes(shortName) || !!stage.teamsFromAdvanced?.includes(shortName)
    if (!participates) continue

    const { result } = stage
    const stageName = STAGE_META[stageId].groupName ?? STAGE_META[stageId].label

    const progressRecord = SWISS_PROGRESS_RECORDS.find((r) => result[r]?.includes(shortName))
    if (progressRecord) {
      records.push({ stage: stageId, stageName, result: progressRecord, status: 'in-progress' })
      continue
    }

    const winRecord = SWISS_RESULT_WIN_RECORDS.find((r) => result[r].includes(shortName))
    if (winRecord) {
      records.push({ stage: stageId, stageName, result: winRecord, status: 'advanced' })
      continue
    }

    const loseRecord = SWISS_RESULT_LOSE_RECORDS.find((r) => result[r].includes(shortName))
    if (loseRecord) {
      records.push({ stage: stageId, stageName, result: loseRecord, status: 'eliminated' })
      continue
    }

    records.push({ stage: stageId, stageName, result: '待赛', status: 'waiting' })
  }

  return records
}

/* -------------------------------------------------------------------------- */
/*                                决胜阶段战绩                                 */
/* -------------------------------------------------------------------------- */

function getPlayoffsPerformance(event: MajorEvent, shortName: string): TeamPerformanceRecord[] {
  const playoffs = event.playoffs
  if (!playoffs?.teams.includes(shortName)) return []

  const { result } = playoffs
  const final = result['2-to-1']

  if (final.winner === shortName) {
    return [{ stage: 'playoffs', stageName: '决赛', result: '冠军', status: 'champion' }]
  }

  if (final.loser === shortName) {
    return [{ stage: 'playoffs', stageName: '决赛', result: '亚军', status: 'advanced' }]
  }

  if (result['4-to-2'].winners.includes(shortName)) {
    const records: TeamPerformanceRecord[] = [
      { stage: 'playoffs', stageName: '半决赛', result: '晋级决赛', status: 'advanced' },
    ]
    if (final.winner || final.loser) {
      records.push({ stage: 'playoffs', stageName: '决赛', result: '待赛', status: 'waiting' })
    }
    return records
  }

  if (result['4-to-2'].losers.includes(shortName)) {
    return [{ stage: 'playoffs', stageName: '半决赛', result: '四强', status: 'eliminated' }]
  }

  if (result['8-to-4'].losers.includes(shortName)) {
    return [{ stage: 'playoffs', stageName: '八进四', result: '八强', status: 'eliminated' }]
  }

  if (result['8-to-4'].winners.includes(shortName)) {
    const records: TeamPerformanceRecord[] = [
      { stage: 'playoffs', stageName: '八进四', result: '晋级四强', status: 'advanced' },
    ]
    const semifinalStarted =
      result['4-to-2'].winners.length > 0 || result['4-to-2'].losers.length > 0
    if (semifinalStarted) {
      records.push({ stage: 'playoffs', stageName: '半决赛', result: '待赛', status: 'waiting' })
    }
    return records
  }

  return [{ stage: 'playoffs', stageName: '八进四', result: '待赛', status: 'waiting' }]
}

/** 队伍在整个赛事中的表现轨迹 */
export function getTeamPerformance(event: MajorEvent, shortName: string): TeamPerformanceRecord[] {
  return [...getSwissPerformance(event, shortName), ...getPlayoffsPerformance(event, shortName)]
}

/* -------------------------------------------------------------------------- */
/*                                  状态                                       */
/* -------------------------------------------------------------------------- */

/** 队伍当前状态（取表现轨迹的最后一条） */
export function getTeamStatus(performances: TeamPerformanceRecord[]): TeamStatus {
  const last = performances.at(-1)
  if (!last) return { text: '未开赛', tone: 'idle' }

  switch (last.status) {
    case 'champion':
      return { text: '🏆 冠军', tone: 'champion' }
    case 'in-progress':
      return { text: '赛程中', tone: 'in-progress' }
    case 'waiting':
      return { text: '等待中', tone: 'waiting' }
    case 'eliminated':
      return { text: '❌ 已淘汰', tone: 'eliminated' }
    default:
      return last.result === '亚军'
        ? { text: '🥈 亚军', tone: 'runner-up' }
        : { text: '已晋级', tone: 'advanced' }
  }
}

/* -------------------------------------------------------------------------- */
/*                                  排序                                       */
/* -------------------------------------------------------------------------- */

const PLAYOFF_RESULT_RANK: Record<string, number> = {
  冠军: 1,
  亚军: 2,
  晋级决赛: 3,
  四强: 4,
  晋级四强: 5,
  八强: 6,
  待赛: 99,
}

const SWISS_STAGE_RANK: Record<string, number> = {
  'stage-3': 1,
  'stage-2': 2,
  'stage-1': 3,
}

const SWISS_RESULT_RANK: Record<string, number> = {
  '3-0': 1,
  '3-1': 2,
  '3-2': 3,
  '2-3': 4,
  '1-3': 5,
  '0-3': 6,
  '2-0': 10,
  '2-1': 11,
  '1-0': 12,
  '2-2': 13,
  '1-1': 14,
  '0-1': 15,
  '1-2': 16,
  '0-2': 17,
}

const STATUS_RANK: Record<TeamPerformanceStatus, number> = {
  champion: 1,
  advanced: 2,
  'in-progress': 3,
  waiting: 4,
  eliminated: 5,
}

/** 实力排序：冠军 > 亚军 > 四强 > 八强 > 淘汰，同层再看瑞士轮成绩 */
function compareTeams(
  a: { performance: TeamPerformanceRecord[]; stage: string },
  b: { performance: TeamPerformanceRecord[]; stage: string },
): number {
  const lastA = a.performance.at(-1)
  const lastB = b.performance.at(-1)

  const statusA = lastA?.status ?? 'eliminated'
  const statusB = lastB?.status ?? 'eliminated'

  // 1. 未淘汰优先
  if (statusA === 'eliminated' && statusB !== 'eliminated') return 1
  if (statusA !== 'eliminated' && statusB === 'eliminated') return -1

  // 2. 进入决胜阶段优先
  const playoffsA = a.performance.find((p) => p.stage === 'playoffs')
  const playoffsB = b.performance.find((p) => p.stage === 'playoffs')
  if (playoffsA && !playoffsB) return -1
  if (!playoffsA && playoffsB) return 1

  // 3. 决胜阶段名次
  if (playoffsA && playoffsB) {
    const rankA = PLAYOFF_RESULT_RANK[playoffsA.result] ?? 99
    const rankB = PLAYOFF_RESULT_RANK[playoffsB.result] ?? 99
    if (rankA !== rankB) return rankA - rankB
  }

  // 4. 打到的最深瑞士轮阶段
  const swissA = a.performance.filter((p) => p.stage.startsWith('stage-')).at(-1)
  const swissB = b.performance.filter((p) => p.stage.startsWith('stage-')).at(-1)

  const stageRankA = swissA ? (SWISS_STAGE_RANK[swissA.stage] ?? 99) : 99
  const stageRankB = swissB ? (SWISS_STAGE_RANK[swissB.stage] ?? 99) : 99
  if (stageRankA !== stageRankB) return stageRankA - stageRankB

  // 5. 同阶段内的战绩
  const resultRankA = swissA ? (SWISS_RESULT_RANK[swissA.result] ?? 99) : 99
  const resultRankB = swissB ? (SWISS_RESULT_RANK[swissB.result] ?? 99) : 99
  if (resultRankA !== resultRankB) return resultRankA - resultRankB

  // 6. 当前状态
  const statusRankA = STATUS_RANK[statusA] ?? 99
  const statusRankB = STATUS_RANK[statusB] ?? 99
  if (statusRankA !== statusRankB) return statusRankA - statusRankB

  // 7. 起始组别（起点高说明种子实力强）
  return (SWISS_STAGE_RANK[a.stage] ?? 99) - (SWISS_STAGE_RANK[b.stage] ?? 99)
}

export interface RankedTeam extends Team {
  performance: TeamPerformanceRecord[]
  status: TeamStatus
}

/** 按实力排序的参赛队伍 */
export function getRankedTeams(event: MajorEvent): RankedTeam[] {
  return event.teams
    .map((team) => {
      const performance = getTeamPerformance(event, team.id)
      return { ...team, performance, status: getTeamStatus(performance) }
    })
    .toSorted(compareTeams)
}
