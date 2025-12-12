import eventsData from '@/data/events.json'
import predictionsData from '@/data/predictions.json'
import { EventStatus } from '../types'

import type {
  MajorEvent,
  EventPredictions,
  PredictorStats,
  SwissResult,
  StagePrediction,
  StagePassStatus,
  PredictorPrediction,
  StageProgress,
  EventProgress,
  StageType,
  MajorStageType,
  PlayoffStageType,
  TaskStageType,
  SwissPredictionBucket,
} from '../types'
import {
  SWISS_RESULT_RECORDS,
  SWISS_PROGRESS_RECORDS,
  SWISS_STAGES,
  STAGE_NAME_MAP,
  STAGE_TYPE,
} from './constants'

export const events = eventsData as MajorEvent[]
export const predictions = predictionsData as EventPredictions[]
export const firstEvent = events.at(0) as MajorEvent

export const evt = {
  /** 存在指定赛事 ID */
  hasEvent(eventId: string): boolean {
    return events.some((e) => e.id === eventId)
  },

  /** 获取指定赛事  */
  getEvent(eventId?: string): MajorEvent {
    return eventId ? events.find((e) => e.id === eventId) || firstEvent : firstEvent
  },

  /** 获取所有赛事名称列表 */
  eventNames: events.map((e) => ({ id: e.id, name: e.name })),

  /** 获取指定赛事的竞猜数据 */
  getPredictions(eventId: string): PredictorPrediction[] {
    return predictions.find((p) => p.id === eventId)?.predictions || []
  },
}

/**
 * 检查竞猜是否仍有可能成真（基于当前进度）
 * @param teamName 队伍名称
 * @param swissPredictionBucket 竞猜类型：3-0 / 3-1-or-3-2 / 0-3
 * @param result 瑞士轮结果（包含进行中的战绩和最终结果）
 * @returns true 表示竞猜仍有可能，false 表示已不可能
 */
export function isSwissPredictionPossible(
  teamName: string,
  swissPredictionBucket: SwissPredictionBucket,
  result?: SwissResult,
): boolean {
  // 如果没有结果数据，默认认为仍有可能
  if (!result) return true

  // 先检查队伍是否已经有最终结果
  for (const record of SWISS_RESULT_RECORDS) {
    if (result[record].includes(teamName)) {
      // 已经确定最终结果，检查是否匹配竞猜
      if (swissPredictionBucket === '3-0') {
        return record === '3-0'
      }
      if (swissPredictionBucket === '0-3') {
        return record === '0-3'
      }
      if (swissPredictionBucket === '3-1-or-3-2') {
        return record === '3-1' || record === '3-2'
      }
    }
  }

  // 检查队伍在哪个进行中的战绩组
  for (const record of SWISS_PROGRESS_RECORDS) {
    if (result[record].includes(teamName)) {
      const [wins, losses] = record.split('-').map(Number)

      // 检查 3-0 竞猜
      if (swissPredictionBucket === '3-0') {
        // 有任何失败就不可能 3-0
        return losses === 0
      }

      // 检查 0-3 竞猜
      if (swissPredictionBucket === '0-3') {
        // 有任何胜利就不可能 0-3
        return wins === 0
      }

      // 3-1-or-3-2 竞猜：只要还在比赛中，都有可能
      return true
    }
  }

  // 队伍不在任何组中，可能还未开始或数据不全，默认认为仍有可能
  return true
}

/**
 * 计算瑞士轮阶段是否通过
 * 规则：竞猜的 10 支队伍中，有 5 支符合实际结果即通过
 * - 3-0 竞猜的队伍实际必须 3-0 晋级，算正确
 * - 3-1-or-3-2 竞猜的队伍实际必须 3-1 或 3-2 晋级，算正确
 * - 0-3 竞猜的队伍实际必须 0-3 淘汰，算正确
 */
function checkSwissStagePass(
  stageId: TaskStageType,
  prediction?: StagePrediction,
  result?: SwissResult,
): StagePassStatus {
  const totalCount = 10
  const requiredCount = 5

  if (!prediction || !result) {
    return {
      stageId,
      passed: null,
      totalCount,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: false,
      impossibleCount: 0,
    }
  }

  // 检查阶段结果是否完整
  const isActualResultComplete = isSwissResultComplete(result)

  let correctCount = 0
  let impossibleCount = 0
  const correctTeams: string[] = []

  // 检查 3-0 竞猜（必须实际 3-0 才算对）
  for (const team of prediction['3-0']) {
    if (result['3-0'].includes(team)) {
      correctCount++
      correctTeams.push(team)
    } else if (!isSwissPredictionPossible(team, '3-0', result)) {
      impossibleCount++
    }
  }

  // 检查 3-1-or-3-2 竞猜（必须实际 3-1 或 3-2 才算对）
  for (const team of prediction['3-1-or-3-2']) {
    if (result['3-1'].includes(team) || result['3-2'].includes(team)) {
      correctCount++
      correctTeams.push(team)
    } else if (!isSwissPredictionPossible(team, '3-1-or-3-2', result)) {
      impossibleCount++
    }
  }

  // 检查 0-3 竞猜（必须实际 0-3 才算对）
  for (const team of prediction['0-3']) {
    if (result['0-3'].includes(team)) {
      correctCount++
      correctTeams.push(team)
    } else if (!isSwissPredictionPossible(team, '0-3', result)) {
      impossibleCount++
    }
  }

  // 检查是否还有结果未确定（存在进行中的战绩）
  const hasProgressData = SWISS_PROGRESS_RECORDS.some((e) => result[e].length)

  let details = `${correctCount}/10 正确`
  if (hasProgressData && impossibleCount > 0) {
    details += ` · ${impossibleCount} 已失败`
  } else {
    details += ` (需 ${requiredCount} 个)`
  }

  return {
    stageId,
    totalCount,
    passed:
      correctCount >= requiredCount
        ? true
        : impossibleCount > totalCount - requiredCount
          ? false
          : null,
    correctCount,
    requiredCount,
    details,
    isActualResultComplete,
    impossibleCount,
  }
}

/**
 * 计算 8 进 4 是否通过
 * 规则：竞猜的 4 支四强队伍中，有 2 支进入四强即通过
 */
function check8to4Pass(prediction: string[], winners: string[], losers: string[]): StagePassStatus {
  const totalCount = 4
  const requiredCount = 2
  const stageId = '8-to-4'

  if (!prediction || !winners.length) {
    return {
      stageId,
      passed: null,
      totalCount,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: false,
      impossibleCount: 0,
    }
  }

  // 8进4完整结果应该有4个winners
  const isResultComplete = winners.length === 4

  let correctCount = 0
  let impossibleCount = 0
  for (const team of prediction) {
    if (winners.includes(team)) {
      correctCount++
    } else if (losers?.length && losers?.includes(team)) {
      // 已被淘汰的队伍，预测错误
      impossibleCount++
    }
  }

  return {
    stageId,
    passed:
      correctCount >= requiredCount
        ? true
        : impossibleCount > totalCount - requiredCount
          ? false
          : null,
    totalCount,
    correctCount,
    requiredCount,
    details: `${correctCount}/4 正确 (需 ${requiredCount} 个)`,
    isActualResultComplete: isResultComplete,
    impossibleCount,
  }
}

/**
 * 计算 4 进 2 是否通过
 * 规则：竞猜的 2 支队伍中，有 1 支进入决赛即通过
 */
function check4to2Pass(
  prediction: string[],
  result: string[],
  allEliminatedTeams: string[],
): StagePassStatus {
  const totalCount = 2
  const requiredCount = 1
  const stageId = '4-to-2'

  if (!prediction || !result.length) {
    return {
      stageId,
      passed: null,
      totalCount,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: false,
      impossibleCount: 0,
    }
  }

  // 4进2完整结果应该有2个winners
  const isResultComplete = result.length === 2

  let correctCount = 0
  let impossibleCount = 0
  for (const team of prediction) {
    if (result.includes(team)) {
      correctCount++
    } else if (allEliminatedTeams.includes(team)) {
      // 已被淘汰的队伍（包括8进4和4进2阶段），预测错误
      impossibleCount++
    }
  }

  return {
    stageId,
    passed:
      correctCount >= requiredCount
        ? true
        : impossibleCount > totalCount - requiredCount
          ? false
          : null,
    totalCount,
    correctCount,
    requiredCount,
    details: `${correctCount}/2 正确 (需 ${requiredCount} 个)`,
    isActualResultComplete: isResultComplete,
    impossibleCount,
  }
}

/**
 * 计算冠军竞猜是否通过
 * 规则：猜对冠军即通过
 */
function check2to1Pass(
  prediction: string | null,
  winner: string | null,
  allEliminatedTeams: string[],
): StagePassStatus {
  const totalCount = 1
  const requiredCount = 1
  const stageId = '2-to-1'

  if (!prediction) {
    return {
      stageId,
      passed: null,
      totalCount,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: !!winner, // 有冠军结果就是完整的
      impossibleCount: 0,
    }
  }

  // 有冠军就是完整结果
  const isResultComplete = !!winner

  const isOut = allEliminatedTeams.includes(prediction)
  const isPassed = winner ? prediction === winner : isOut ? false : null
  const correctCount = prediction === winner ? 1 : 0
  const impossibleCount = isOut ? 1 : 0

  return {
    stageId,
    passed: isPassed,
    totalCount,
    correctCount,
    requiredCount,
    details: correctCount >= requiredCount ? '猜中冠军' : '未猜中',
    isActualResultComplete: isResultComplete,
    impossibleCount,
  }
}

// 计算竞猜者统计数据
export function calculatePredictorStats(
  eventId: string,
  predictorId: string,
): PredictorStats | null {
  const targetEvent = evt.getEvent(eventId)
  const predictions = evt.getPredictions(eventId)

  if (!targetEvent) return null

  const predictor = predictions.find((p) => p.id === predictorId)

  if (!predictor) return null

  const stageResults: StagePassStatus[] = []
  let totalPassed = 0
  let totalStages = 0
  let totalCorrect = 0
  let totalPredictions = 0

  for (const stageId of SWISS_STAGES) {
    const stage = targetEvent[stageId]
    const pred = predictor[stageId]

    if (stage && pred) {
      const result = checkSwissStagePass(stageId, pred, stage.result)
      stageResults.push(result)
      totalStages++
      totalCorrect += result.correctCount
      totalPredictions += pred['3-0'].length + pred['3-1-or-3-2'].length + pred['0-3'].length
      if (result.passed) totalPassed++
    }
  }

  // 计算决胜阶段
  if (targetEvent.playoffs && predictor.playoffs) {
    const playoffs = targetEvent.playoffs.result

    // 8 进 4
    const result84 = check8to4Pass(
      predictor.playoffs['8-to-4'],
      playoffs['8-to-4'].winners,
      playoffs['8-to-4'].losers,
    )
    stageResults.push(result84)
    totalStages++
    totalCorrect += result84.correctCount
    totalPredictions += predictor.playoffs['8-to-4'].length
    if (result84.passed) totalPassed++

    // 4 进 2（需要传入所有已淘汰队伍：8进4的losers + 4进2的losers）
    const allEliminatedBefore4to2 = [...playoffs['8-to-4'].losers, ...playoffs['4-to-2'].losers]
    const result42 = check4to2Pass(
      predictor.playoffs['4-to-2'],
      playoffs['4-to-2'].winners,
      allEliminatedBefore4to2,
    )

    stageResults.push(result42)
    totalStages++
    totalCorrect += result42.correctCount
    totalPredictions += predictor.playoffs['4-to-2'].length
    if (result42.passed) totalPassed++

    // 冠军（需要传入所有已淘汰队伍：8进4 + 4进2 + 决赛 loser）
    const result21 = check2to1Pass(
      predictor.playoffs['2-to-1'],
      playoffs['2-to-1'].winner,
      [...allEliminatedBefore4to2, playoffs['2-to-1'].loser].filter(Boolean) as string[],
    )

    stageResults.push(result21)
    totalStages++
    totalCorrect += result21.correctCount
    totalPredictions += predictor.playoffs['2-to-1'] ? 1 : 0
    if (result21.passed) totalPassed++
  }

  return {
    id: predictor.id,
    name: predictor.name,
    platform: predictor.platform || '',
    link: predictor.link,
    totalPassed,
    totalStages,
    totalCorrect,
    totalPredictions,
    stageResults,
  }
}

// 获取所有竞猜者的统计数据并排序
export function getAllPredictorStats(eventId: string): PredictorStats[] {
  const predictions = evt.getPredictions(eventId)
  if (!predictions.length) return []

  const stats: PredictorStats[] = []

  for (const p of predictions) {
    const stat = calculatePredictorStats(eventId, p.id)
    if (stat) {
      stats.push(stat)
    }
  }

  // 按阶段数排序，相同则按通过总正确数排序
  return stats.toSorted((a, b) => {
    if (b.totalPassed !== a.totalPassed) {
      return b.totalPassed - a.totalPassed
    }
    if (b.totalCorrect !== a.totalCorrect) {
      return b.totalCorrect - a.totalCorrect
    }
    return 0
  })
}

// 获取阶段显示名称
export function getStageName(stageId: MajorStageType | PlayoffStageType): string {
  return STAGE_NAME_MAP[stageId] || stageId
}

// 获取竞猜者的具体竞猜数据
export function getPredictorPrediction(
  eventId: string,
  predictorId: string,
): PredictorPrediction | null {
  const predictions = evt.getPredictions(eventId)
  if (!predictions.length) return null

  return predictions.find((p) => p.id === predictorId) || null
}

/**
 * 检查瑞士轮阶段结果是否完整
 * 完整标准：所有结果组别都有队伍，且符合数量要求（3-0 2, 3-1 3, 3-2 3, 2-3, 3 1-3 3, 0-3 2）
 */
function isSwissResultComplete(result?: SwissResult): boolean {
  if (!result) return false

  const isTwoMatch = (['3-0', '0-3'] as const).every((e) => result[e].length === 2)
  const isThreeMatch = (['3-1', '3-2', '2-3', '1-3'] as const).every((e) => result[e].length === 3)

  return isTwoMatch && isThreeMatch
}

/**
 * 检查瑞士轮阶段是否有部分结果
 */
function hasSwissResults(result: SwissResult | undefined): boolean {
  if (!result) return false
  const allGroups = [...SWISS_PROGRESS_RECORDS, ...SWISS_RESULT_RECORDS]
  return allGroups.some((group) => result[group] && result[group].length > 0)
}

/**
 * 检查决胜阶段某轮结果是否完整
 */
function isPlayoffsRoundComplete(
  winners: string[],
  losers: string[],
  expectedWinners: number,
): boolean {
  return winners.length === expectedWinners && losers.length > 0
}

/**
 * 获取单个阶段的进度信息
 */
export function getStageProgressInfo(
  event: MajorEvent,
  stageId: MajorStageType,
  stageType: StageType,
): StageProgress {
  const { data: stageData, name: stageName } = getStageConfig(event).find((e) => e.id === stageId)!

  if (!stageData) {
    return {
      stageId,
      stageName,
      status: 'not_started',
      hasResults: false,
      isResultsComplete: false,
    }
  }

  if (stageType === STAGE_TYPE.SWISS) {
    const swissStage = stageData as NonNullable<MajorEvent['stage-1']>
    const hasResults = hasSwissResults(swissStage.result)
    const isComplete = isSwissResultComplete(swissStage.result)

    return {
      stageId,
      stageName,
      status: isComplete ? 'completed' : hasResults ? 'in_progress' : 'not_started',
      hasResults,
      isResultsComplete: isComplete,
    }
  } else {
    // playoffs
    const playoffsStage = stageData as NonNullable<MajorEvent['playoffs']>
    const has8to4 = playoffsStage.result['8-to-4'].winners.length > 0
    const is8to4Complete = isPlayoffsRoundComplete(
      playoffsStage.result['8-to-4'].winners,
      playoffsStage.result['8-to-4'].losers,
      4,
    )
    const has4to2 = playoffsStage.result['4-to-2'].winners.length > 0
    const is4to2Complete = isPlayoffsRoundComplete(
      playoffsStage.result['4-to-2'].winners,
      playoffsStage.result['4-to-2'].losers,
      2,
    )
    const hasChampion = !!playoffsStage.result['2-to-1'].winner

    const hasResults = has8to4 || has4to2 || hasChampion
    const isComplete = hasChampion && is4to2Complete && is8to4Complete

    return {
      stageId,
      stageName,
      status: isComplete ? 'completed' : hasResults ? 'in_progress' : 'not_started',
      hasResults,
      isResultsComplete: isComplete,
    }
  }
}

const getStageConfig = (event: MajorEvent) => {
  return [
    { id: 'stage-1' as const, name: '第一阶段', data: event['stage-1'], type: STAGE_TYPE.SWISS },
    { id: 'stage-2' as const, name: '第二阶段', data: event['stage-2'], type: STAGE_TYPE.SWISS },
    { id: 'stage-3' as const, name: '第三阶段', data: event['stage-3'], type: STAGE_TYPE.SWISS },
    { id: 'playoffs' as const, name: '决胜阶段', data: event.playoffs, type: STAGE_TYPE.PLAYOFFS },
  ]
}

/**
 * 智能判断赛事当前状态和进度
 * 根据 event 的 result 字段自动判断赛事进行到哪个阶段
 */
export function getEventProgress(event: MajorEvent): EventProgress {
  const stagesConfig = getStageConfig(event)

  const stagesProgress: StageProgress[] = stagesConfig.map((stage) =>
    getStageProgressInfo(event, stage.id, stage.type),
  )

  // 找到所有已完成和进行中的阶段
  const completedStages = stagesProgress
    .filter((s) => s.status === 'completed')
    .map((s) => s.stageId)
  const notStartedStages = stagesProgress
    .filter((s) => s.status === 'not_started')
    .map((s) => s.stageId)
  const inProgressStage = stagesProgress.find((s) => s.status === 'in_progress')
  const hasAnyResults = stagesProgress.some((s) => s.hasResults)

  // 抽离关键布尔变量
  const hasInProgressStage = !!inProgressStage
  const hasNotStartedStages = notStartedStages.length > 0
  const allStagesCompleted = completedStages.length === 4
  const noResults = !hasAnyResults

  // 赛阶段的状态判断抽离为独立函数
  const getPlayoffsStatus = (playoffsStage: any): EventStatus => {
    if (!playoffsStage) return EventStatus.playoffS_2_TO_1

    const is8to4Complete = isPlayoffsRoundComplete(
      playoffsStage.result['8-to-4'].winners,
      playoffsStage.result['8-to-4'].losers,
      4,
    )

    const has4to2 = playoffsStage.result['4-to-2'].winners.length > 0

    const is4to2Complete = isPlayoffsRoundComplete(
      playoffsStage.result['4-to-2'].winners,
      playoffsStage.result['4-to-2'].losers,
      2,
    )

    const has2to1 = !!playoffsStage.result['2-to-1'].winner

    if (!is8to4Complete) {
      return EventStatus.playoffS_8_TO_4
    }

    if (!has4to2) {
      return EventStatus.playoffS_8_TO_4_COMPLETED
    }

    if (!is4to2Complete) {
      return EventStatus.playoffS_4_TO_2
    }

    return has2to1 ? EventStatus.COMPLETED : EventStatus.playoffS_2_TO_1
  }

  // 阶段 ID 到状态的映射
  const stageStatusMap: Record<string, EventStatus> = {
    'stage-1': EventStatus.STAGE_1,
    'stage-2': EventStatus.STAGE_2,
    'stage-3': EventStatus.STAGE_3,
    playoffs: EventStatus.playoffS_2_TO_1, // 基础状态，决赛会特殊处理
  }

  const completedStageStatusMap: Record<string, EventStatus> = {
    'stage-1': EventStatus.STAGE_1_COMPLETED,
    'stage-2': EventStatus.STAGE_2_COMPLETED,
    'stage-3': EventStatus.STAGE_3_COMPLETED,
    playoffs: EventStatus.COMPLETED,
  }

  const notStartedStageStatusMap: Record<string, EventStatus> = {
    'stage-1': EventStatus.NOT_STARTED,
    'stage-2': EventStatus.STAGE_1_COMPLETED,
    'stage-3': EventStatus.STAGE_2_COMPLETED,
    playoffs: EventStatus.STAGE_3_COMPLETED,
  }

  // 主逻辑
  let currentStage: MajorStageType | null = null
  let eventStatus: EventStatus = EventStatus.NOT_STARTED

  if (noResults) {
    eventStatus = EventStatus.NOT_STARTED
    currentStage = null
  } else if (hasInProgressStage) {
    currentStage = inProgressStage.stageId

    if (currentStage === 'playoffs') {
      eventStatus = getPlayoffsStatus(event.playoffs)
    } else {
      eventStatus = stageStatusMap[currentStage] || EventStatus.NOT_STARTED
    }
  } else if (hasNotStartedStages) {
    // 取最后一个未开始的阶段
    const lastNotStarted = notStartedStages[notStartedStages.length - 1]
    currentStage = lastNotStarted || null
    eventStatus = notStartedStageStatusMap[lastNotStarted] || EventStatus.COMPLETED
  } else if (allStagesCompleted) {
    eventStatus = EventStatus.COMPLETED
    currentStage = null
  } else {
    // 取最后一个已完成的阶段
    const lastCompleted = completedStages[completedStages.length - 1]
    currentStage = lastCompleted || null
    eventStatus = completedStageStatusMap[lastCompleted] || EventStatus.COMPLETED
  }

  return {
    eventStatus,
    currentStage,
    completedStages,
    stagesProgress,
  }
}

/**
 * 获取当前活跃的阶段列表（已完成 + 进行中 + 已竞猜但等待结果的阶段）
 */
export function getActiveStages(event: MajorEvent): {
  id: MajorStageType
  name: string
  status: 'completed' | 'in_progress' | 'waiting'
  hasResults: boolean
  hasPredictions: boolean
}[] {
  const progress = getEventProgress(event)
  const predictions = evt.getPredictions(event.id)

  // 检查某阶段是否有竞猜
  const hasPredictionsForStage = (stageId: string): boolean => {
    if (!predictions.length) return false
    return predictions.some((p) => {
      if (stageId === 'playoffs') return p.playoffs && p.playoffs['2-to-1']
      const stage = p[stageId as 'stage-1' | 'stage-2' | 'stage-3']
      return stage && stage['3-0'].length && stage['3-1-or-3-2'].length && stage['0-3'].length
    })
  }

  return progress.stagesProgress
    .filter((s) => {
      // 显示: 有结果的阶段 或 有竞猜的阶段
      return s.hasResults || hasPredictionsForStage(s.stageId)
    })
    .map((s) => ({
      id: s.stageId,
      name: s.stageName,
      status:
        s.status === 'not_started'
          ? ('waiting' as const)
          : (s.status as 'completed' | 'in_progress'),
      hasResults: s.hasResults,
      hasPredictions: hasPredictionsForStage(s.stageId),
    }))
}

/**
 * 判断某个阶段是否应该显示
 */
export function shouldShowStage(event: MajorEvent, stageId: string): boolean {
  const progress = getEventProgress(event)
  const stageProgress = progress.stagesProgress.find((s) => s.stageId === stageId)
  return stageProgress ? stageProgress.hasResults : false
}

/**
 * 获取赛事状态描述文本
 */
export function getEventStatusText(eventStatus: EventStatus): string {
  const statusTexts: Record<EventStatus, string> = {
    [EventStatus.NOT_STARTED]: '赛事未开始',
    [EventStatus.STAGE_1]: '第一阶段进行中',
    [EventStatus.STAGE_1_COMPLETED]: '第一阶段已完成，第二阶段等待中',
    [EventStatus.STAGE_2]: '第二阶段进行中',
    [EventStatus.STAGE_2_COMPLETED]: '第二阶段已完成，第三阶段等待中',
    [EventStatus.STAGE_3]: '第三阶段进行中',
    [EventStatus.STAGE_3_COMPLETED]: '第三阶段已完成，八进四等待中',
    [EventStatus.playoffS_8_TO_4]: '八进四进行中',
    [EventStatus.playoffS_8_TO_4_COMPLETED]: '八进四已完成，半决赛等待中',
    [EventStatus.playoffS_4_TO_2]: '半决赛进行中',
    [EventStatus.playoffS_4_TO_2_COMPLETED]: '半决赛已完成，决赛等待中',
    [EventStatus.playoffS_2_TO_1]: '决赛进行中',
    [EventStatus.COMPLETED]: '赛事已完成',
  }
  return statusTexts[eventStatus]
}

/**
 * 判断竞猜者是否有某个阶段的竞猜数据
 */
export function hasPredictionForStage(prediction: PredictorPrediction, stageId: string): boolean {
  if (stageId === 'playoffs') {
    return !!prediction.playoffs
  } else {
    const stagePred = prediction[stageId as 'stage-1' | 'stage-2' | 'stage-3']
    return !!stagePred
  }
}

/**
 * 判断某个阶段是否应该在竞猜者详情页显示
 * 规则：只要有竞猜数据就显示,不管是否有比赛结果
 */
export function shouldShowStageInPredictorDetail(
  prediction: PredictorPrediction,
  event: MajorEvent,
  stageId: string,
): boolean {
  // 检查是否有竞猜数据
  const hasPrediction = hasPredictionForStage(prediction, stageId)
  if (!hasPrediction) return false

  // 检查阶段配置是否存在
  if (stageId === 'playoffs') {
    return !!event.playoffs
  } else {
    return !!event[stageId as 'stage-1' | 'stage-2' | 'stage-3']
  }
}

/**
 * 判断某个阶段是否有比赛结果可以显示对比
 */
export function hasStageResults(event: MajorEvent, stageId: string): boolean {
  return shouldShowStage(event, stageId)
}

/**
 * 检查瑞士轮是否有进行中的战绩(非最终结果)
 */
export function hasSwissInProgressResults(result: SwissResult | undefined): boolean {
  if (!result) return false

  const inProgressRecords = ['1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2'] as const

  return inProgressRecords.some((record) => result[record] && result[record]!.length > 0)
}

/**
 * 检查瑞士轮是否有最终结果(晋级/淘汰)
 */
export function hasSwissPlayoffResults(result: SwissResult | undefined): boolean {
  if (!result) return false

  const playoffRecords = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3'] as const

  return playoffRecords.some((record) => result[record] && result[record].length > 0)
}
