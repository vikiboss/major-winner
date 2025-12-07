import eventsData from '@/data/events.json'
import predictionsData from '@/data/predictions.json'
import type {
  MajorEvent,
  EventPredictions,
  PredictorStats,
  SwissResult,
  StagePrediction,
  StageId,
  StagePassStatus,
  PredictorPrediction,
  EventStatus,
  StageProgress,
  EventProgress,
} from '../types'
import { EventStatus as EventStatusEnum } from '../types'

export const events = eventsData as unknown as MajorEvent[]
export const predictions = predictionsData as EventPredictions[]

// 获取指定赛事
export function getEvent(eventId: string): MajorEvent | undefined {
  return events.find((e) => e.id === eventId)
}

// 获取指定赛事的竞猜数据
export function getEventPredictions(eventId: string): EventPredictions | undefined {
  return predictions.find((p) => p.id === eventId)
}

// 获取战队全名
export function getTeamFullName(event: MajorEvent, shortName: string): string {
  const team = event.teams.find((t) => t.name === shortName)
  return team?.name || shortName
}

/**
 * 检查竞猜是否仍有可能成真（基于当前进度）
 * @param teamName 队伍名称
 * @param predictionBucket 竞猜类型：3-0 / 3-1-or-3-2 / 0-3
 * @param result 瑞士轮结果（包含进行中的战绩和最终结果）
 * @returns true 表示竞猜仍有可能，false 表示已不可能
 */
export function isPredictionPossible(
  teamName: string,
  predictionBucket: '3-0' | '3-1-or-3-2' | '0-3',
  result: SwissResult | undefined,
): boolean {
  // 如果没有结果数据，默认认为仍有可能
  if (!result) return true

  // 所有可能的战绩记录
  const progressRecords: Array<keyof SwissResult> = [
    '1-0',
    '0-1',
    '1-1',
    '2-0',
    '0-2',
    '2-1',
    '1-2',
    '2-2',
  ]
  const finalRecords: Array<keyof SwissResult> = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3']

  // 先检查队伍是否已经有最终结果
  for (const record of finalRecords) {
    if (result[record]?.includes(teamName)) {
      // 已经确定最终结果，检查是否匹配竞猜
      if (predictionBucket === '3-0') {
        return record === '3-0'
      }
      if (predictionBucket === '0-3') {
        return record === '0-3'
      }
      if (predictionBucket === '3-1-or-3-2') {
        return record === '3-1' || record === '3-2'
      }
    }
  }

  // 检查队伍在哪个进行中的战绩组
  for (const record of progressRecords) {
    if (result[record]?.includes(teamName)) {
      const [wins, losses] = record.split('-').map(Number)

      // 检查 3-0 竞猜
      if (predictionBucket === '3-0') {
        // 有任何失败就不可能 3-0
        return losses === 0
      }

      // 检查 0-3 竞猜
      if (predictionBucket === '0-3') {
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
  stageId: string,
  prediction: StagePrediction | undefined,
  actual: SwissResult | undefined,
): StagePassStatus {
  const totalCount = 10
  const requiredCount = 5

  if (!prediction || !actual) {
    return {
      stageId,
      passed: null,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: false,
      impossibleCount: 0,
    }
  }

  // 检查阶段结果是否完整
  const isActualResultComplete = isSwissResultComplete(actual)

  let correctCount = 0
  let impossibleCount = 0
  const correctTeams: string[] = []

  // 检查 3-0 竞猜（必须实际 3-0 才算对）
  for (const team of prediction['3-0']) {
    if (actual['3-0'].includes(team)) {
      correctCount++
      correctTeams.push(team)
    } else if (!isPredictionPossible(team, '3-0', actual)) {
      impossibleCount++
    }
  }

  // 检查 3-1-or-3-2 竞猜（必须实际 3-1 或 3-2 才算对）
  for (const team of prediction['3-1-or-3-2']) {
    if (actual['3-1'].includes(team) || actual['3-2'].includes(team)) {
      correctCount++
      correctTeams.push(team)
    } else if (!isPredictionPossible(team, '3-1-or-3-2', actual)) {
      impossibleCount++
    }
  }

  // 检查 0-3 竞猜（必须实际 0-3 才算对）
  for (const team of prediction['0-3']) {
    if (actual['0-3'].includes(team)) {
      correctCount++
      correctTeams.push(team)
    } else if (!isPredictionPossible(team, '0-3', actual)) {
      impossibleCount++
    }
  }

  // 检查是否还有结果未确定（存在进行中的战绩）
  const hasProgressData =
    actual['1-0']?.length ||
    actual['0-1']?.length ||
    actual['1-1']?.length ||
    actual['2-0']?.length ||
    actual['0-2']?.length ||
    actual['2-1']?.length ||
    actual['1-2']?.length ||
    actual['2-2']?.length

  let details = `${correctCount}/10 正确`
  if (hasProgressData && impossibleCount > 0) {
    details += ` · ${impossibleCount} 已失败`
  } else {
    details += ` (需${requiredCount}个)`
  }

  return {
    stageId,
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
function check8to4Pass(
  prediction: string[] | undefined,
  actual: string[] | undefined,
  losers: string[] | undefined,
): StagePassStatus {
  const totalCount = 4
  const requiredCount = 2
  const stageId = '8-to-4'

  if (!prediction || !actual) {
    return {
      stageId,
      passed: null,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: false,
      impossibleCount: 0,
    }
  }

  // 8进4完整结果应该有4个winners
  const isResultComplete = actual.length === 4

  let correctCount = 0
  let impossibleCount = 0
  for (const team of prediction) {
    if (actual.includes(team)) {
      correctCount++
    } else if (losers && losers.includes(team)) {
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
  prediction: string[] | undefined,
  actual: string[] | undefined,
  allEliminatedTeams: string[],
): StagePassStatus {
  const totalCount = 2
  const requiredCount = 1
  const stageId = '4-to-2'

  if (!prediction || !actual) {
    return {
      stageId,
      passed: null,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: false,
      impossibleCount: 0,
    }
  }

  // 4进2完整结果应该有2个winners
  const isResultComplete = actual.length === 2

  let correctCount = 0
  let impossibleCount = 0
  for (const team of prediction) {
    if (actual.includes(team)) {
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
  prediction: string | null | undefined,
  actual: string | null | undefined,
  loser: string | null | undefined,
  allEliminatedTeams: string[],
): StagePassStatus {
  const requiredCount = 1
  const stageId = '2-to-1'

  if (!prediction || !actual) {
    return {
      stageId,
      passed: null,
      correctCount: 0,
      requiredCount,
      details: '无竞猜数据',
      isActualResultComplete: !!actual, // 有冠军结果就是完整的
      impossibleCount: 0,
    }
  }

  // 有冠军就是完整结果
  const isResultComplete = true

  const correctCount = prediction === actual ? 1 : 0

  // 如果预测的队伍是决赛输家或之前被淘汰，则算错误
  let impossibleCount = 0
  if (prediction === loser || allEliminatedTeams.includes(prediction)) {
    impossibleCount = 1
  }

  return {
    stageId,
    passed: correctCount >= requiredCount,
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
  const event = getEvent(eventId)
  const eventPreds = getEventPredictions(eventId)

  if (!event || !eventPreds) return null

  const predictor = eventPreds.predictions.find((p) => p.id === predictorId)

  if (!predictor) return null

  const stageResults: StagePassStatus[] = []
  let totalPassed = 0
  let totalStages = 0
  let totalCorrect = 0
  let totalPredictions = 0

  // 计算瑞士轮阶段 (stage-1, stage-2, stage-3)
  const stages: StageId[] = ['stage-1', 'stage-2', 'stage-3']
  for (const stageId of stages) {
    const stage = event[stageId]
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

  // 计算决赛阶段
  if (event.finals && predictor.finals) {
    const finals = event.finals.result

    // 8 进 4
    const result84 = check8to4Pass(
      predictor.finals['8-to-4'],
      finals['8-to-4'].winners,
      finals['8-to-4'].losers,
    )
    stageResults.push(result84)
    totalStages++
    totalCorrect += result84.correctCount
    totalPredictions += predictor.finals['8-to-4'].length
    if (result84.passed) totalPassed++

    // 4 进 2（需要传入所有已淘汰队伍：8进4的losers + 4进2的losers）
    const allEliminatedBefore4to2 = [...finals['8-to-4'].losers, ...finals['4-to-2'].losers]
    const result42 = check4to2Pass(
      predictor.finals['4-to-2'],
      finals['4-to-2'].winners,
      allEliminatedBefore4to2,
    )
    stageResults.push(result42)
    totalStages++
    totalCorrect += result42.correctCount
    totalPredictions += predictor.finals['4-to-2'].length
    if (result42.passed) totalPassed++

    // 冠军（需要传入所有已淘汰队伍：8进4 + 4进2 + 决赛loser）
    const allEliminatedBeforeChampion = [...finals['8-to-4'].losers, ...finals['4-to-2'].losers]
    const result21 = check2to1Pass(
      predictor.finals['2-to-1'],
      finals['2-to-1'].winner,
      finals['2-to-1'].loser,
      allEliminatedBeforeChampion,
    )
    stageResults.push(result21)
    totalStages++
    totalCorrect += result21.correctCount
    totalPredictions += predictor.finals['2-to-1'] ? 1 : 0
    if (result21.passed) totalPassed++
  }

  return {
    id: predictor.id,
    name: predictor.name,
    platform: predictor.platform || '',
    description: predictor.description,
    link: predictor.link,
    totalPassed,
    totalStages,
    passRate: totalStages > 0 ? (totalPassed / totalStages) * 100 : 0,
    totalCorrect,
    totalPredictions,
    stageResults,
  }
}

// 获取所有竞猜者的统计数据并排序
export function getAllPredictorStats(eventId: string): PredictorStats[] {
  const eventPreds = getEventPredictions(eventId)
  if (!eventPreds) return []

  const stats: PredictorStats[] = []

  for (const p of eventPreds.predictions) {
    const stat = calculatePredictorStats(eventId, p.id)
    if (stat) {
      stats.push(stat)
    }
  }

  // 按总正确数排序，相同则按通过阶段数排序
  return stats.sort((a, b) => {
    if (b.totalCorrect !== a.totalCorrect) {
      return b.totalCorrect - a.totalCorrect
    }
    if (b.totalPassed !== a.totalPassed) {
      return b.totalPassed - a.totalPassed
    }
    return b.passRate - a.passRate
  })
}

// 获取阶段显示名称
export function getStageName(stageId: string): string {
  const names: Record<string, string> = {
    'stage-1': '第一阶段',
    'stage-2': '第二阶段',
    'stage-3': '第三阶段',
    '8-to-4': '八进四',
    '4-to-2': '半决赛',
    '2-to-1': '决赛',
    finals: '决赛阶段',
  }
  return names[stageId] || stageId
}

// 获取竞猜者的具体竞猜数据
export function getPredictorPrediction(
  eventId: string,
  predictorId: string,
): PredictorPrediction | null {
  const eventPreds = getEventPredictions(eventId)
  if (!eventPreds) return null

  return eventPreds.predictions.find((p) => p.id === predictorId) || null
}

/**
 * 检查瑞士轮阶段结果是否完整
 * 完整标准：所有结果组别都有队伍（3-0, 3-1, 3-2, 2-3, 1-3, 0-3 至少各有一支队伍）
 */
function isSwissResultComplete(result: SwissResult | undefined): boolean {
  if (!result) return false

  const allGroups = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3'] as const
  return allGroups.every((group) => result[group] && result[group].length > 0)
}

/**
 * 检查瑞士轮阶段是否有部分结果
 */
function hasSwissResults(result: SwissResult | undefined): boolean {
  if (!result) return false

  const allGroups = [
    '3-0',
    '3-1',
    '3-2',
    '2-3',
    '1-3',
    '0-3',
    '1-0',
    '0-1',
    '1-1',
    '2-0',
    '0-2',
    '2-2',
  ] as const

  return allGroups.some((group) => result[group] && result[group].length > 0)
}

/**
 * 检查决赛阶段某轮结果是否完整
 */
function isFinalsRoundComplete(
  winners: string[],
  losers: string[],
  expectedWinners: number,
): boolean {
  return winners.length === expectedWinners && losers.length > 0
}

/**
 * 获取单个阶段的进度信息
 */
function getStageProgressInfo(
  stageId: string,
  stageName: string,
  stageData: MajorEvent['stage-1'] | MajorEvent['finals'] | null,
  stageType: 'swiss' | 'finals',
): StageProgress {
  if (!stageData) {
    return {
      stageId,
      stageName,
      status: 'not_started',
      hasResults: false,
      isResultsComplete: false,
    }
  }

  if (stageType === 'swiss') {
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
    // finals
    const finalsStage = stageData as NonNullable<MajorEvent['finals']>
    const has8to4 = finalsStage.result['8-to-4'].winners.length > 0
    const is8to4Complete = isFinalsRoundComplete(
      finalsStage.result['8-to-4'].winners,
      finalsStage.result['8-to-4'].losers,
      4,
    )
    const has4to2 = finalsStage.result['4-to-2'].winners.length > 0
    const is4to2Complete = isFinalsRoundComplete(
      finalsStage.result['4-to-2'].winners,
      finalsStage.result['4-to-2'].losers,
      2,
    )
    const hasChampion = !!finalsStage.result['2-to-1'].winner

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

/**
 * 智能判断赛事当前状态和进度
 * 根据 event 的 result 字段自动判断赛事进行到哪个阶段
 */
export function getEventProgress(event: MajorEvent): EventProgress {
  const stagesConfig = [
    { id: 'stage-1', name: '第一阶段', data: event['stage-1'], type: 'swiss' as const },
    { id: 'stage-2', name: '第二阶段', data: event['stage-2'], type: 'swiss' as const },
    { id: 'stage-3', name: '第三阶段', data: event['stage-3'], type: 'swiss' as const },
    { id: 'finals', name: '决赛阶段', data: event.finals, type: 'finals' as const },
  ]

  const stagesProgress: StageProgress[] = stagesConfig.map((stage) =>
    getStageProgressInfo(stage.id, stage.name, stage.data, stage.type),
  )

  // 找到所有已完成和进行中的阶段
  const completedStages = stagesProgress
    .filter((s) => s.status === 'completed')
    .map((s) => s.stageId)
  const inProgressStage = stagesProgress.find((s) => s.status === 'in_progress')
  const hasAnyResults = stagesProgress.some((s) => s.hasResults)

  // 确定当前阶段
  let currentStage: string | null = null
  let eventStatus: EventStatus = EventStatusEnum.NOT_STARTED

  if (!hasAnyResults) {
    eventStatus = EventStatusEnum.NOT_STARTED
    currentStage = null
  } else if (inProgressStage) {
    currentStage = inProgressStage.stageId

    // 根据当前进行中的阶段确定状态
    if (inProgressStage.stageId === 'stage-1') {
      eventStatus = EventStatusEnum.STAGE_1
    } else if (inProgressStage.stageId === 'stage-2') {
      eventStatus = EventStatusEnum.STAGE_2
    } else if (inProgressStage.stageId === 'stage-3') {
      eventStatus = EventStatusEnum.STAGE_3
    } else if (inProgressStage.stageId === 'finals') {
      // 决赛阶段需要更细粒度判断
      const finalsStage = event.finals
      if (finalsStage) {
        const is8to4Complete = isFinalsRoundComplete(
          finalsStage.result['8-to-4'].winners,
          finalsStage.result['8-to-4'].losers,
          4,
        )
        const has4to2 = finalsStage.result['4-to-2'].winners.length > 0
        const is4to2Complete = isFinalsRoundComplete(
          finalsStage.result['4-to-2'].winners,
          finalsStage.result['4-to-2'].losers,
          2,
        )

        if (!is8to4Complete) {
          eventStatus = EventStatusEnum.FINALS_8_TO_4
        } else if (has4to2 && !is4to2Complete) {
          eventStatus = EventStatusEnum.FINALS_4_TO_2
        } else {
          eventStatus = EventStatusEnum.FINALS_2_TO_1
        }
      }
    }
  } else {
    // 所有阶段都已完成
    const allCompleted = stagesProgress.every(
      (s) => s.status === 'completed' || s.status === 'not_started',
    )
    if (allCompleted && completedStages.length === 4) {
      eventStatus = EventStatusEnum.COMPLETED
      currentStage = null
    } else {
      // 找到最后一个已完成的阶段
      const lastCompleted = [...completedStages].pop()
      if (lastCompleted === 'stage-1') {
        eventStatus = EventStatusEnum.STAGE_1_COMPLETED
      } else if (lastCompleted === 'stage-2') {
        eventStatus = EventStatusEnum.STAGE_2_COMPLETED
      } else if (lastCompleted === 'stage-3') {
        eventStatus = EventStatusEnum.STAGE_3_COMPLETED
      } else if (lastCompleted === 'finals') {
        eventStatus = EventStatusEnum.COMPLETED
      }
      currentStage = lastCompleted || null
    }
  }

  // 判断是否可以显示结果和排行榜
  const canShowResults = hasAnyResults
  const canShowLeaderboard = completedStages.length > 0

  return {
    eventStatus,
    currentStage,
    completedStages,
    stagesProgress,
    canShowResults,
    canShowLeaderboard,
  }
}

/**
 * 获取当前活跃的阶段列表（已完成 + 进行中 + 已竞猜但等待结果的阶段）
 */
export function getActiveStages(event: MajorEvent): Array<{
  id: string
  name: string
  status: 'completed' | 'in_progress' | 'waiting'
  hasResults: boolean
  hasPredictions: boolean
}> {
  const progress = getEventProgress(event)
  const eventPreds = getEventPredictions(event.id)

  // 检查某阶段是否有竞猜
  const hasPredictionsForStage = (stageId: string): boolean => {
    if (!eventPreds) return false
    return eventPreds.predictions.some((p) => {
      if (stageId === 'finals') return p.finals !== null
      return p[stageId as 'stage-1' | 'stage-2' | 'stage-3'] !== null
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
 * 判断是否应该显示排行榜
 */
export function shouldShowLeaderboard(event: MajorEvent): boolean {
  const progress = getEventProgress(event)
  return progress.canShowLeaderboard
}

/**
 * 获取赛事状态描述文本
 */
export function getEventStatusText(eventStatus: EventStatus): string {
  const statusTexts: Record<EventStatus, string> = {
    [EventStatusEnum.NOT_STARTED]: '赛事未开始',
    [EventStatusEnum.STAGE_1]: '第一阶段进行中',
    [EventStatusEnum.STAGE_1_COMPLETED]: '第一阶段已完成',
    [EventStatusEnum.STAGE_2]: '第二阶段进行中',
    [EventStatusEnum.STAGE_2_COMPLETED]: '第二阶段已完成',
    [EventStatusEnum.STAGE_3]: '第三阶段进行中',
    [EventStatusEnum.STAGE_3_COMPLETED]: '第三阶段已完成',
    [EventStatusEnum.FINALS_8_TO_4]: '八进四进行中',
    [EventStatusEnum.FINALS_4_TO_2]: '半决赛进行中',
    [EventStatusEnum.FINALS_2_TO_1]: '决赛进行中',
    [EventStatusEnum.COMPLETED]: '赛事已完成',
  }
  return statusTexts[eventStatus]
}

/**
 * 判断竞猜者是否有某个阶段的竞猜数据
 */
export function hasPredictionForStage(prediction: PredictorPrediction, stageId: string): boolean {
  if (stageId === 'finals') {
    return !!prediction.finals
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
  if (stageId === 'finals') {
    return !!event.finals
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
export function hasSwissFinalResults(result: SwissResult | undefined): boolean {
  if (!result) return false

  const finalRecords = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3'] as const

  return finalRecords.some((record) => result[record] && result[record].length > 0)
}
