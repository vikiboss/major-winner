/**
 * 评分核心：把「实际结果」和「竞猜」比对成可展示的状态。
 *
 * 所有页面都只依赖这里的判定，不再各自写一套「猜对/猜错」逻辑。
 */

import {
  PASS_RULE,
  SWISS_BUCKET_MATCH,
  SWISS_BUCKETS,
  SWISS_PROGRESS_RECORDS,
  SWISS_RESULT_RECORDS,
  SWISS_RESULT_SIZE,
  TASK_STAGES,
} from '@/lib/constants'

import type {
  MajorEvent,
  PlayoffStageType,
  PlayoffsResult,
  PredictorPrediction,
  StagePassStatus,
  StagePrediction,
  SwissPredictionBucket,
  SwissProgressRecord,
  SwissResult,
  SwissResultRecord,
  SwissStageType,
  TaskStageType,
  TeamOutcome,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*                              实际结果完整性                                 */
/* -------------------------------------------------------------------------- */

/** 瑞士轮结果是否完整：各战绩分组的队伍数量都达标 */
export function isSwissResultComplete(result?: SwissResult): boolean {
  if (!result) return false
  return SWISS_RESULT_RECORDS.every(
    (record) => (result[record]?.length ?? 0) === SWISS_RESULT_SIZE[record],
  )
}

/** 瑞士轮是否已有任何结果（含进行中战绩） */
export function hasSwissResults(result?: SwissResult): boolean {
  if (!result) return false
  const records = [...SWISS_PROGRESS_RECORDS, ...SWISS_RESULT_RECORDS]
  return records.some((record) => (result[record]?.length ?? 0) > 0)
}

/** 决胜阶段单轮是否结束 */
export function isPlayoffRoundComplete(result: PlayoffsResult, round: PlayoffStageType): boolean {
  if (round === '2-to-1') return !!result['2-to-1'].winner
  return result[round].winners.length === (round === '8-to-4' ? 4 : 2)
}

/* -------------------------------------------------------------------------- */
/*                                 队伍判定                                    */
/* -------------------------------------------------------------------------- */

function findRecord<T extends SwissResultRecord | SwissProgressRecord>(
  result: SwissResult,
  team: string,
  records: readonly T[],
): T | undefined {
  return records.find((record) => result[record]?.includes(team))
}

/**
 * 瑞士轮竞猜中某队的判定结果。
 * - `win`：最终战绩落在竞猜分组内
 * - `lose`：已经不可能落在该分组
 * - `pending`：仍有希望
 */
export function getSwissTeamOutcome(
  team: string,
  bucket: SwissPredictionBucket,
  result?: SwissResult,
): TeamOutcome {
  if (!result) return 'pending'

  const finalRecord = findRecord(result, team, SWISS_RESULT_RECORDS)
  if (finalRecord) return SWISS_BUCKET_MATCH[bucket].includes(finalRecord) ? 'win' : 'lose'

  const progressRecord = findRecord(result, team, SWISS_PROGRESS_RECORDS)
  if (progressRecord) {
    const [wins, losses] = progressRecord.split('-').map(Number)
    if (bucket === '3-0') return losses === 0 ? 'pending' : 'lose'
    if (bucket === '0-3') return wins === 0 ? 'pending' : 'lose'
  }

  return 'pending'
}

/**
 * 该队在该轮次结束时是否已被淘汰（包含本轮败者）。
 * 用于把「已经出局」的竞猜判为错误，而不是继续显示为待定。
 */
export function isTeamEliminated(
  team: string,
  round: PlayoffStageType,
  result: PlayoffsResult,
): boolean {
  const eliminated: string[] = [...result['8-to-4'].losers]

  if (round !== '8-to-4') eliminated.push(...result['4-to-2'].losers)
  if (round === '2-to-1' && result['2-to-1'].loser) eliminated.push(result['2-to-1'].loser)

  return eliminated.includes(team)
}

/** 决胜阶段竞猜中某队的判定结果 */
export function getPlayoffTeamOutcome(
  team: string,
  round: PlayoffStageType,
  result?: PlayoffsResult,
): TeamOutcome {
  if (!result) return 'pending'

  const winners = round === '2-to-1' ? [result['2-to-1'].winner] : result[round].winners
  if (winners.includes(team)) return 'win'

  if (round === '2-to-1' && result['2-to-1'].winner) return 'lose'
  return isTeamEliminated(team, round, result) ? 'lose' : 'pending'
}

/* -------------------------------------------------------------------------- */
/*                                  计分                                       */
/* -------------------------------------------------------------------------- */

export interface StageScore {
  correctCount: number
  impossibleCount: number
  correctTeams: string[]
}

function scoreTeams(teams: string[], judge: (team: string) => TeamOutcome): StageScore {
  const correctTeams: string[] = []
  let impossibleCount = 0

  for (const team of teams) {
    const outcome = judge(team)
    if (outcome === 'win') correctTeams.push(team)
    else if (outcome === 'lose') impossibleCount++
  }

  return { correctCount: correctTeams.length, impossibleCount, correctTeams }
}

/** 瑞士轮竞猜计分 */
export function scoreSwissPrediction(prediction: StagePrediction, result: SwissResult): StageScore {
  const correctTeams: string[] = []
  let impossibleCount = 0

  for (const bucket of SWISS_BUCKETS) {
    for (const team of prediction[bucket]) {
      const outcome = getSwissTeamOutcome(team, bucket, result)
      if (outcome === 'win') correctTeams.push(team)
      else if (outcome === 'lose') impossibleCount++
    }
  }

  return { correctCount: correctTeams.length, impossibleCount, correctTeams }
}

/* -------------------------------------------------------------------------- */
/*                              任务通过状态                                   */
/* -------------------------------------------------------------------------- */

function buildStatus(
  stageId: TaskStageType,
  score: StageScore,
  isComplete: boolean,
): StagePassStatus {
  const { total, required } = PASS_RULE[stageId]

  return {
    stageId,
    passed:
      score.correctCount >= required
        ? true
        : score.impossibleCount > total - required
          ? false
          : null,
    totalCount: total,
    requiredCount: required,
    correctCount: score.correctCount,
    impossibleCount: score.impossibleCount,
    isActualResultComplete: isComplete,
  }
}

/** 竞猜者是否提交了某个任务的竞猜 */
export function hasPredictionForStage(
  prediction: PredictorPrediction,
  stageId: TaskStageType,
): boolean {
  if (stageId === '8-to-4' || stageId === '4-to-2') {
    return !!prediction.playoffs?.[stageId]?.length
  }
  if (stageId === '2-to-1') return !!prediction.playoffs?.['2-to-1']
  return !!prediction[stageId as SwissStageType]
}

/** 竞猜数量（用于统计总竞猜数） */
function countPredictions(prediction: PredictorPrediction, stageId: TaskStageType): number {
  if (stageId === '2-to-1') return prediction.playoffs?.['2-to-1'] ? 1 : 0
  if (stageId === '8-to-4' || stageId === '4-to-2') {
    return prediction.playoffs?.[stageId]?.length ?? 0
  }
  const swiss = prediction[stageId as SwissStageType]
  return swiss ? swiss['3-0'].length + swiss['3-X'].length + swiss['0-3'].length : 0
}

/** 计算某个竞猜任务的状态；没有竞猜或没有结果时返回 null */
export function evaluateStage(
  event: MajorEvent,
  stageId: TaskStageType,
  prediction: PredictorPrediction,
): StagePassStatus | null {
  if (!hasPredictionForStage(prediction, stageId)) return null

  if (stageId === '8-to-4' || stageId === '4-to-2' || stageId === '2-to-1') {
    const playoffs = event.playoffs?.result
    const pick = prediction.playoffs?.[stageId]
    if (!playoffs || !pick) return null

    const teams = typeof pick === 'string' ? [pick] : pick
    const score = scoreTeams(teams, (team) => getPlayoffTeamOutcome(team, stageId, playoffs))
    return buildStatus(stageId, score, isPlayoffRoundComplete(playoffs, stageId))
  }

  const stage = event[stageId as SwissStageType]
  const swissPrediction = prediction[stageId as SwissStageType]
  if (!stage || !swissPrediction) return null

  const score = scoreSwissPrediction(swissPrediction, stage.result)
  return buildStatus(stageId, score, isSwissResultComplete(stage.result))
}

/** 汇总单个竞猜者在某赛事的全部成绩 */
export function evaluatePredictor(event: MajorEvent, prediction: PredictorPrediction) {
  const stageResults: StagePassStatus[] = []
  let totalPassed = 0
  let totalCorrect = 0
  let totalPredictions = 0

  for (const stageId of TASK_STAGES) {
    const status = evaluateStage(event, stageId, prediction)
    if (!status) continue

    stageResults.push(status)
    totalCorrect += status.correctCount
    totalPredictions += countPredictions(prediction, stageId)
    if (status.passed) totalPassed++
  }

  return {
    stageResults,
    totalPassed,
    totalStages: stageResults.length,
    totalCorrect,
    totalPredictions,
  }
}
