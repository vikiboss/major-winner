/**
 * 竞猜数据的查询与视图模型。
 *
 * 页面只消费这里产出的 `PredictorRow` / `PredictorStats`，
 * 不再在渲染过程中反复计算统计（原来每个单元格都重算一次）。
 */

import {
  GROUP_LABEL,
  PLAYOFF_ROUNDS,
  RESULT_PREDICTOR_ID,
  SWISS_BUCKETS,
  SWISS_STAGES,
  isSwissStage,
} from '@/lib/constants'

import {
  evaluatePredictor,
  getPlayoffTeamOutcome,
  getSwissTeamOutcome,
  hasPredictionForStage,
} from './scoring'
import {
  compareByCorrectFirst,
  compareByImpossibleFirst,
  compareByPlayoffs,
  compareLeaderboard,
  buildFrequencyRank,
  sortByRank,
} from './sort'
import { getEvent, getRoundProgress, getStageProgress } from './progress'
import { predictionFiles, predictorMap } from './store'

import type {
  MajorEvent,
  MajorStageType,
  PredictorPrediction,
  PredictorStats,
  StagePassStatus,
  StageProgressStatus,
  StageView,
  SwissStageType,
  TaskStageType,
  TeamOutcome,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*                                   缓存                                      */
/* -------------------------------------------------------------------------- */

const predictionsCache = new Map<string, PredictorPrediction[]>()
const statsCache = new Map<string, Map<string, PredictorStats>>()
const rowsCache = new Map<string, PredictorRow[]>()
const stageViewsCache = new Map<string, StageView[]>()

/* -------------------------------------------------------------------------- */
/*                                 竞猜查询                                    */
/* -------------------------------------------------------------------------- */

/** 取某赛事所有竞猜（已合并竞猜者资料） */
export function getEventPredictions(eventId: string): PredictorPrediction[] {
  const cached = predictionsCache.get(eventId)
  if (cached) return cached

  const file = predictionFiles.find((p) => p.id === eventId)
  const list = (file?.predictions ?? []).map((prediction) => {
    const profile = predictorMap.get(prediction.id)
    return profile ? { ...prediction, ...profile } : prediction
  })

  predictionsCache.set(eventId, list)
  return list
}

/** 某赛事是否配置了竞猜数据 */
export function hasPredictions(eventId: string): boolean {
  return getEventPredictions(eventId).length > 0
}

/** 全部竞猜者的成绩表 */
export function getStatsMap(eventId: string): Map<string, PredictorStats> {
  const cached = statsCache.get(eventId)
  if (cached) return cached

  const event = getEvent(eventId)
  const map = new Map<string, PredictorStats>()

  for (const prediction of getEventPredictions(eventId)) {
    map.set(prediction.id, { ...prediction, ...evaluatePredictor(event, prediction) })
  }

  statsCache.set(eventId, map)
  return map
}

/** 单个竞猜者的成绩 */
export function getPredictorStats(eventId: string, predictorId: string): PredictorStats | null {
  return getStatsMap(eventId).get(predictorId) ?? null
}

/** 排行榜：按通过任务数、猜对个数排序 */
export function getAllPredictorStats(eventId: string): PredictorStats[] {
  return [...getStatsMap(eventId).values()].toSorted(compareLeaderboard)
}

/* -------------------------------------------------------------------------- */
/*                                 表格行模型                                  */
/* -------------------------------------------------------------------------- */

export interface PredictionTeam {
  id: string
  outcome: TeamOutcome
}

export interface PredictionGroup {
  /** 分组唯一标识，用作 key 与频次统计 */
  id: string
  /** 分组标签，如 3-0 / 四强 */
  label: string
  /** 该分组对应的评分任务 */
  taskId: TaskStageType
  teams: PredictionTeam[]
}

export interface PredictorRow {
  predictor: PredictorPrediction
  stats: PredictorStats
  /** 当前查看阶段的通过状态（决胜阶段为 null，看 aggregate） */
  stage: StagePassStatus | null
  /** 各任务通过状态，key 为 TaskStageType */
  stageMap: Record<string, StagePassStatus>
  /** 竞猜分组（瑞士轮 3 组 / 决胜阶段 3 轮） */
  groups: PredictionGroup[]
  /** 决胜阶段聚合成绩 */
  aggregate: {
    passed: number
    failed: number
    correct: number
    impossible: number
  }
}

function buildGroups(
  event: MajorEvent,
  prediction: PredictorPrediction,
  scope: MajorStageType,
): PredictionGroup[] {
  if (scope === 'playoffs') {
    const result = event.playoffs?.result
    const playoffs = prediction.playoffs
    if (!playoffs) return []

    return PLAYOFF_ROUNDS.map((round) => {
      const picks =
        round === '2-to-1'
          ? playoffs['2-to-1']
            ? [playoffs['2-to-1']]
            : []
          : playoffs[round as '8-to-4' | '4-to-2']

      return {
        id: `${scope}:${round}`,
        label: GROUP_LABEL[round],
        taskId: round,
        teams: picks.map((id) => ({
          id,
          outcome: getPlayoffTeamOutcome(id, round, result),
        })),
      }
    })
  }

  const stageId = scope as SwissStageType
  const swiss = prediction[stageId]
  if (!swiss) return []

  return SWISS_BUCKETS.map((bucket) => ({
    id: `${scope}:${bucket}`,
    label: bucket,
    taskId: stageId,
    teams: swiss[bucket].map((id) => ({
      id,
      outcome: getSwissTeamOutcome(id, bucket, event[stageId].result),
    })),
  }))
}

function aggregatePlayoffs(stageMap: Record<string, StagePassStatus>) {
  return PLAYOFF_ROUNDS.reduce(
    (acc, round) => {
      const status = stageMap[round]
      if (!status) return acc
      if (status.passed) acc.passed++
      else if (status.passed === false) acc.failed++
      acc.correct += status.correctCount
      acc.impossible += status.impossibleCount
      return acc
    },
    { passed: 0, failed: 0, correct: 0, impossible: 0 },
  )
}

/** 竞猜者是否参与了这个大阶段 */
function participatesIn(prediction: PredictorPrediction, scope: MajorStageType): boolean {
  return scope === 'playoffs' ? !!prediction.playoffs : !!prediction[scope]
}

/**
 * 生成某大阶段（stage-1 / stage-2 / stage-3 / playoffs）的表格行。
 * 行已按该阶段的规则排序，分组内的队伍按出现频次排序。
 */
export function buildRows(eventId: string, scope: MajorStageType): PredictorRow[] {
  const cacheKey = `${eventId}:${scope}`
  const cached = rowsCache.get(cacheKey)
  if (cached) return cached

  const event = getEvent(eventId)
  const statsMap = getStatsMap(eventId)

  const rows: PredictorRow[] = getEventPredictions(eventId)
    .filter((prediction) => participatesIn(prediction, scope))
    .map((prediction) => {
      const stats = statsMap.get(prediction.id)!
      const stageMap: Record<string, StagePassStatus> = {}
      for (const status of stats.stageResults) stageMap[status.stageId] = status

      return {
        predictor: prediction,
        stats,
        stage: stageMap[scope] ?? null,
        stageMap,
        groups: buildGroups(event, prediction, scope),
        aggregate: aggregatePlayoffs(stageMap),
      }
    })

  // 让同一列里的队伍按热门程度对齐
  const teamsByGroup = new Map<string, string[][]>()
  for (const row of rows) {
    for (const group of row.groups) {
      const lists = teamsByGroup.get(group.id) ?? []
      lists.push(group.teams.map((team) => team.id))
      teamsByGroup.set(group.id, lists)
    }
  }

  const rankByGroup = new Map<string, Map<string, number>>()
  for (const [groupId, lists] of teamsByGroup) {
    rankByGroup.set(groupId, buildFrequencyRank(lists))
  }

  const sorted = rows
    .map((row) => ({
      ...row,
      groups: row.groups.map((group) => ({
        ...group,
        teams: sortByRank(group.teams, rankByGroup.get(group.id) ?? new Map()),
      })),
    }))
    .toSorted(scope === 'playoffs' ? compareByPlayoffs : compareByCorrectFirst)

  rowsCache.set(cacheKey, sorted)
  return sorted
}

/** 首页预览：只取前 limit 位，按「还没炸」优先（不含「比赛结果」这条基准记录） */
export function getPreviewRows(eventId: string, stageId: TaskStageType, limit = 3): PredictorRow[] {
  const scope: MajorStageType = isSwissStage(stageId) ? stageId : 'playoffs'

  return buildRows(eventId, scope)
    .filter((row) => row.predictor.id !== RESULT_PREDICTOR_ID)
    .map((row) => ({ ...row, stage: row.stageMap[stageId] ?? null }))
    .toSorted(compareByImpossibleFirst)
    .slice(0, limit)
}

/** 各阶段参与竞猜的人数 */
export function getStagePredictionCounts(eventId: string): Record<MajorStageType, number> {
  const predictions = getEventPredictions(eventId)
  const count = (predicate: (p: PredictorPrediction) => boolean) =>
    predictions.filter(predicate).length

  return {
    'stage-1': count((p) => !!p['stage-1']),
    'stage-2': count((p) => !!p['stage-2']),
    'stage-3': count((p) => !!p['stage-3']),
    playoffs: count((p) => !!p.playoffs),
  }
}

/* -------------------------------------------------------------------------- */
/*                                 阶段视图                                    */
/* -------------------------------------------------------------------------- */

function toViewStatus(
  progress: { hasResults: boolean; isComplete: boolean },
  hasPredictions: boolean,
): StageProgressStatus {
  if (progress.isComplete) return 'completed'
  if (progress.hasResults) return 'in_progress'
  return hasPredictions ? 'waiting' : 'not_started'
}

/**
 * 把赛事拆成页面上要展示的阶段序列：
 * 三个瑞士轮 + 决胜阶段的三轮，并给出各自状态与是否可见。
 */
export function getStageViews(eventId: string): StageView[] {
  const cached = stageViewsCache.get(eventId)
  if (cached) return cached

  const event = getEvent(eventId)
  const predictions = getEventPredictions(eventId)
  const views: StageView[] = []

  for (const stageId of SWISS_STAGES) {
    const progress = getStageProgress(event, stageId)
    const stagePredictions = predictions.some((p) => hasPredictionForStage(p, stageId))
    const round = { hasResults: progress.hasResults, isComplete: progress.isResultsComplete }

    views.push({
      id: stageId,
      kind: 'swiss',
      status: toViewStatus(round, stagePredictions),
      hasResults: progress.hasResults,
      hasPredictions: stagePredictions,
      visible: progress.hasResults || stagePredictions,
    })
  }

  const hasPlayoffPredictions = predictions.some((p) => !!p.playoffs)
  let unlocked = true

  for (const round of PLAYOFF_ROUNDS) {
    const progress = getRoundProgress(event.playoffs, round)
    const status: StageProgressStatus = unlocked
      ? toViewStatus(progress, hasPlayoffPredictions)
      : hasPlayoffPredictions
        ? 'waiting'
        : 'not_started'

    views.push({
      id: round,
      kind: 'playoffs',
      status,
      hasResults: progress.hasResults,
      hasPredictions: hasPlayoffPredictions,
      visible: progress.hasResults || status !== 'not_started',
    })

    unlocked = progress.isComplete
  }

  stageViewsCache.set(eventId, views)
  return views
}

/** 只保留需要展示的阶段 */
export function getVisibleStages(eventId: string): StageView[] {
  return getStageViews(eventId).filter((view) => view.visible)
}

/** 某阶段参与竞猜的人数 */
export function countParticipants(eventId: string, stageId: TaskStageType): number {
  return buildRows(eventId, isSwissStage(stageId) ? stageId : 'playoffs').length
}
