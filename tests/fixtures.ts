/**
 * 测试用的赛事 / 竞猜构造器。
 *
 * 固定使用 A–P 十六支队伍，便于手算期望值。
 */

import { evaluatePredictor } from '@/lib/data/scoring'

import type {
  MajorEvent,
  PlayoffsResult,
  PlayoffsStage,
  PredictorPrediction,
  PredictorStats,
  StagePrediction,
  SwissResult,
  SwissStage,
} from '@/types'

export const SWISS_TEAMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']

export function emptySwissResult(): SwissResult {
  return {
    '1-0': [],
    '0-1': [],
    '1-1': [],
    '2-0': [],
    '0-2': [],
    '2-1': [],
    '1-2': [],
    '2-2': [],
    '3-0': [],
    '3-1': [],
    '3-2': [],
    '2-3': [],
    '1-3': [],
    '0-3': [],
  }
}

/** 一个完整的 16 队瑞士轮结果（3-0×2 / 3-1×3 / 3-2×3 / 2-3×3 / 1-3×3 / 0-3×2） */
export function completeSwissResult(): SwissResult {
  return {
    ...emptySwissResult(),
    '3-0': ['A', 'B'],
    '3-1': ['C', 'D', 'E'],
    '3-2': ['F', 'G', 'H'],
    '2-3': ['I', 'J', 'K'],
    '1-3': ['L', 'M', 'N'],
    '0-3': ['O', 'P'],
  }
}

export function emptyPlayoffsResult(): PlayoffsResult {
  return {
    '8-to-4': { winners: [], losers: [] },
    '4-to-2': { winners: [], losers: [] },
    '2-to-1': { winner: null, loser: null },
  }
}

/** 完整决胜阶段：A 夺冠，B 亚军，C/D 四强，E–H 八强 */
export function completePlayoffsResult(): PlayoffsResult {
  return {
    '8-to-4': { winners: ['A', 'B', 'C', 'D'], losers: ['E', 'F', 'G', 'H'] },
    '4-to-2': { winners: ['A', 'B'], losers: ['C', 'D'] },
    '2-to-1': { winner: 'A', loser: 'B' },
  }
}

export function makeSwissStage(
  teams: string[] = [],
  result: SwissResult = emptySwissResult(),
  teamsFromAdvanced?: string[],
): SwissStage {
  return teamsFromAdvanced ? { name: 'test', teams, teamsFromAdvanced, result } : { name: 'test', teams, result }
}

export function makePlayoffsStage(
  teams: string[] = [],
  result: PlayoffsResult = emptyPlayoffsResult(),
): PlayoffsStage {
  return { teams, result }
}

export interface EventOptions {
  'stage-1'?: SwissStage
  'stage-2'?: SwissStage
  'stage-3'?: SwissStage
  playoffs?: PlayoffsStage
}

/** 默认：stage-1 有 16 支队伍、无结果；后续阶段为空 */
export function makeEvent(options: EventOptions = {}): MajorEvent {
  return {
    id: 'test-event',
    name: 'Test Major',
    shortName: 'Test',
    current: 'stage-1',
    teams: SWISS_TEAMS.map((id) => ({ id, stage: 'stage-1' as const })),
    'stage-1': options['stage-1'] ?? makeSwissStage(SWISS_TEAMS),
    'stage-2': options['stage-2'] ?? makeSwissStage(),
    'stage-3': options['stage-3'] ?? makeSwissStage(),
    playoffs: options.playoffs ?? makePlayoffsStage(),
  }
}

/** stage-1 已完成、决胜阶段已完成的完整赛事 */
export function makeCompleteEvent(): MajorEvent {
  return makeEvent({
    'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
    playoffs: makePlayoffsStage(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], completePlayoffsResult()),
  })
}

/* -------------------------------------------------------------------------- */
/*                                  竞猜                                       */
/* -------------------------------------------------------------------------- */

export function makePredictor(
  id: string,
  overrides: Partial<PredictorPrediction> = {},
): PredictorPrediction {
  return { id, name: id.toUpperCase(), platform: 'test', ...overrides }
}

/** 瑞士轮竞猜：3-0 ×2 / 3-X ×6 / 0-3 ×2 */
export function makeSwissPick(
  teams: { '3-0': [string, string]; '3-X': string[]; '0-3': [string, string] },
): StagePrediction {
  return { '3-0': teams['3-0'], '3-X': teams['3-X'], '0-3': teams['0-3'] }
}

/** 满分瑞士轮竞猜（10/10） */
export function perfectSwissPick(): StagePrediction {
  return makeSwissPick({
    '3-0': ['A', 'B'],
    '3-X': ['C', 'D', 'E', 'F', 'G', 'H'],
    '0-3': ['O', 'P'],
  })
}

/** 5/10 通过的瑞士轮竞猜：3-0 全中、3-X 中 3 支、0-3 全错 */
export function passingSwissPick(): StagePrediction {
  return makeSwissPick({
    '3-0': ['A', 'B'],
    '3-X': ['C', 'D', 'E', 'I', 'J', 'K'],
    '0-3': ['L', 'M'],
  })
}

/** 4/10 且已确定失败（6 个错误）的瑞士轮竞猜 */
export function failingSwissPick(): StagePrediction {
  return makeSwissPick({
    '3-0': ['A', 'F'],
    '3-X': ['C', 'D', 'E', 'I', 'J', 'K'],
    '0-3': ['L', 'M'],
  })
}

export function makeStatsMap(
  event: MajorEvent,
  predictions: PredictorPrediction[],
): Map<string, PredictorStats> {
  return new Map(
    predictions.map((prediction) => [
      prediction.id,
      { ...prediction, ...evaluatePredictor(event, prediction) },
    ]),
  )
}

