import { describe, expect, it } from 'vitest'

import {
  evaluatePredictor,
  evaluateStage,
  getPlayoffTeamOutcome,
  getSwissTeamOutcome,
  hasPredictionForStage,
  isPlayoffRoundComplete,
  isSwissResultComplete,
  isTeamEliminated,
  hasSwissResults,
  scoreSwissPrediction,
} from '@/lib/data/scoring'

import {
  completePlayoffsResult,
  completeSwissResult,
  emptyPlayoffsResult,
  emptySwissResult,
  failingSwissPick,
  makeEvent,
  makePlayoffsStage,
  makePredictor,
  makeSwissPick,
  makeSwissStage,
  passingSwissPick,
  perfectSwissPick,
  SWISS_TEAMS,
} from '../../tests/fixtures'

/* -------------------------------------------------------------------------- */
/*                              瑞士轮结果完整性                                */
/* -------------------------------------------------------------------------- */

describe('isSwissResultComplete', () => {
  it('空结果不算完整', () => {
    expect(isSwissResultComplete(emptySwissResult())).toBe(false)
    expect(isSwissResultComplete(undefined)).toBe(false)
  })

  it('16 支队伍各就各位才算完整', () => {
    expect(isSwissResultComplete(completeSwissResult())).toBe(true)
  })

  it('少一支队伍即不完整', () => {
    const result = completeSwissResult()
    result['3-1'] = ['C', 'D']
    expect(isSwissResultComplete(result)).toBe(false)
  })

  it('数量超标同样不完整', () => {
    const result = completeSwissResult()
    result['3-0'] = ['A', 'B', 'C']
    expect(isSwissResultComplete(result)).toBe(false)
  })
})

describe('hasSwissResults', () => {
  it('空结果返回 false', () => {
    expect(hasSwissResults(emptySwissResult())).toBe(false)
    expect(hasSwissResults(undefined)).toBe(false)
  })

  it('只有进行中战绩也算有结果', () => {
    const result = emptySwissResult()
    result['1-0'] = ['A']
    expect(hasSwissResults(result)).toBe(true)
  })

  it('只有最终战绩也算有结果', () => {
    const result = emptySwissResult()
    result['0-3'] = ['P']
    expect(hasSwissResults(result)).toBe(true)
  })
})

/* -------------------------------------------------------------------------- */
/*                              瑞士轮队伍判定                                  */
/* -------------------------------------------------------------------------- */

describe('getSwissTeamOutcome', () => {
  const result = completeSwissResult()

  it('最终战绩落在竞猜分组内 → win', () => {
    expect(getSwissTeamOutcome('A', '3-0', result)).toBe('win')
    expect(getSwissTeamOutcome('C', '3-X', result)).toBe('win')
    expect(getSwissTeamOutcome('H', '3-X', result)).toBe('win')
    expect(getSwissTeamOutcome('O', '0-3', result)).toBe('win')
  })

  it('最终战绩落在其它分组 → lose', () => {
    expect(getSwissTeamOutcome('C', '3-0', result)).toBe('lose')
    expect(getSwissTeamOutcome('A', '3-X', result)).toBe('lose')
    expect(getSwissTeamOutcome('I', '3-X', result)).toBe('lose')
    expect(getSwissTeamOutcome('I', '0-3', result)).toBe('lose')
    expect(getSwissTeamOutcome('O', '3-X', result)).toBe('lose')
  })

  it('有败绩时 3-0 已不可能', () => {
    const progress = emptySwissResult()
    progress['1-1'] = ['A']
    progress['2-2'] = ['B']
    expect(getSwissTeamOutcome('A', '3-0', progress)).toBe('lose')
    expect(getSwissTeamOutcome('B', '3-0', progress)).toBe('lose')
  })

  it('有胜绩时 0-3 已不可能', () => {
    const progress = emptySwissResult()
    progress['1-0'] = ['A']
    progress['2-1'] = ['B']
    expect(getSwissTeamOutcome('A', '0-3', progress)).toBe('lose')
    expect(getSwissTeamOutcome('B', '0-3', progress)).toBe('lose')
  })

  it('全胜 / 全败时对应分组仍有机会', () => {
    const progress = emptySwissResult()
    progress['2-0'] = ['A']
    progress['0-2'] = ['P']
    expect(getSwissTeamOutcome('A', '3-0', progress)).toBe('pending')
    expect(getSwissTeamOutcome('P', '0-3', progress)).toBe('pending')
  })

  it('3-X 只要还在赛程中就一直 pending', () => {
    const progress = emptySwissResult()
    progress['0-1'] = ['A']
    progress['2-2'] = ['B']
    expect(getSwissTeamOutcome('A', '3-X', progress)).toBe('pending')
    expect(getSwissTeamOutcome('B', '3-X', progress)).toBe('pending')
  })

  it('未出现在结果中 / 无结果 → pending', () => {
    expect(getSwissTeamOutcome('Z', '3-0', result)).toBe('pending')
    expect(getSwissTeamOutcome('A', '3-0', undefined)).toBe('pending')
    expect(getSwissTeamOutcome('A', '3-0', emptySwissResult())).toBe('pending')
  })
})

/* -------------------------------------------------------------------------- */
/*                              决胜阶段队伍判定                                */
/* -------------------------------------------------------------------------- */

describe('getPlayoffTeamOutcome', () => {
  const result = completePlayoffsResult()

  it('八进四：晋级 / 淘汰 / 待定', () => {
    expect(getPlayoffTeamOutcome('A', '8-to-4', result)).toBe('win')
    expect(getPlayoffTeamOutcome('E', '8-to-4', result)).toBe('lose')
    expect(getPlayoffTeamOutcome('Z', '8-to-4', result)).toBe('pending')
  })

  it('半决赛：四强队伍晋级为 win', () => {
    expect(getPlayoffTeamOutcome('A', '4-to-2', result)).toBe('win')
    expect(getPlayoffTeamOutcome('B', '4-to-2', result)).toBe('win')
  })

  it('半决赛：半决赛落败与八进四落败都算 lose', () => {
    // C/D 是半决赛败者（回归用例：曾漏判为 pending）
    expect(getPlayoffTeamOutcome('C', '4-to-2', result)).toBe('lose')
    expect(getPlayoffTeamOutcome('D', '4-to-2', result)).toBe('lose')
    expect(getPlayoffTeamOutcome('E', '4-to-2', result)).toBe('lose')
    expect(getPlayoffTeamOutcome('Z', '4-to-2', result)).toBe('pending')
  })

  it('决赛：冠军 win，其余 lose', () => {
    expect(getPlayoffTeamOutcome('A', '2-to-1', result)).toBe('win')
    expect(getPlayoffTeamOutcome('B', '2-to-1', result)).toBe('lose')
    expect(getPlayoffTeamOutcome('C', '2-to-1', result)).toBe('lose')
    expect(getPlayoffTeamOutcome('Z', '2-to-1', result)).toBe('lose')
  })

  it('结果未出时不误判', () => {
    const empty = emptyPlayoffsResult()
    expect(getPlayoffTeamOutcome('A', '8-to-4', empty)).toBe('pending')
    expect(getPlayoffTeamOutcome('A', '4-to-2', empty)).toBe('pending')
    expect(getPlayoffTeamOutcome('A', '2-to-1', empty)).toBe('pending')
  })

  it('半决赛未打完时四强队伍仍 pending', () => {
    const partial = completePlayoffsResult()
    partial['4-to-2'] = { winners: [], losers: [] }
    partial['2-to-1'] = { winner: null, loser: null }
    expect(getPlayoffTeamOutcome('C', '4-to-2', partial)).toBe('pending')
  })
})

describe('isTeamEliminated', () => {
  const result = completePlayoffsResult()

  it('八进四只看本轮败者', () => {
    expect(isTeamEliminated('E', '8-to-4', result)).toBe(true)
    expect(isTeamEliminated('A', '8-to-4', result)).toBe(false)
  })

  it('半决赛包含八进四与半决赛败者', () => {
    expect(isTeamEliminated('E', '4-to-2', result)).toBe(true)
    expect(isTeamEliminated('C', '4-to-2', result)).toBe(true)
    expect(isTeamEliminated('A', '4-to-2', result)).toBe(false)
  })

  it('决赛包含前三轮所有败者', () => {
    expect(isTeamEliminated('E', '2-to-1', result)).toBe(true)
    expect(isTeamEliminated('C', '2-to-1', result)).toBe(true)
    expect(isTeamEliminated('B', '2-to-1', result)).toBe(true)
    expect(isTeamEliminated('A', '2-to-1', result)).toBe(false)
  })
})

describe('isPlayoffRoundComplete', () => {
  it('八进四需要 4 支晋级', () => {
    expect(isPlayoffRoundComplete(completePlayoffsResult(), '8-to-4')).toBe(true)
    const partial = completePlayoffsResult()
    partial['8-to-4'].winners = ['A', 'B']
    expect(isPlayoffRoundComplete(partial, '8-to-4')).toBe(false)
  })

  it('半决赛需要 2 支晋级', () => {
    expect(isPlayoffRoundComplete(completePlayoffsResult(), '4-to-2')).toBe(true)
  })

  it('决赛只看是否产生冠军', () => {
    expect(isPlayoffRoundComplete(completePlayoffsResult(), '2-to-1')).toBe(true)
    expect(isPlayoffRoundComplete(emptyPlayoffsResult(), '2-to-1')).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/*                                  计分                                       */
/* -------------------------------------------------------------------------- */

describe('scoreSwissPrediction', () => {
  it('满分竞猜 10 对 0 错', () => {
    const score = scoreSwissPrediction(perfectSwissPick(), completeSwissResult())
    expect(score.correctCount).toBe(10)
    expect(score.impossibleCount).toBe(0)
    expect(score.correctTeams).toHaveLength(10)
  })

  it('刚好达线：5 对 5 错，仍算通过', () => {
    const score = scoreSwissPrediction(passingSwissPick(), completeSwissResult())
    expect(score.correctCount).toBe(5)
    expect(score.impossibleCount).toBe(5)
  })

  it('进行中只统计已确定的对错', () => {
    const progress = emptySwissResult()
    progress['1-0'] = ['A']
    progress['0-1'] = ['B']

    const pick = makeSwissPick({
      '3-0': ['A', 'B'],
      '3-X': ['C', 'D', 'E', 'F', 'G', 'H'],
      '0-3': ['O', 'P'],
    })

    const score = scoreSwissPrediction(pick, progress)
    expect(score.correctCount).toBe(0)
    // B 已有一败，3-0 不再可能
    expect(score.impossibleCount).toBe(1)
  })
})

/* -------------------------------------------------------------------------- */
/*                              任务通过状态                                   */
/* -------------------------------------------------------------------------- */

describe('evaluateStage - 瑞士轮', () => {
  const event = makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()) })

  it('猜对 5 个即通过', () => {
    const status = evaluateStage(event, 'stage-1', makePredictor('p', { 'stage-1': passingSwissPick() }))!
    expect(status.passed).toBe(true)
    expect(status.correctCount).toBe(5)
    expect(status.requiredCount).toBe(5)
    expect(status.totalCount).toBe(10)
    expect(status.isActualResultComplete).toBe(true)
  })

  it('已确定错误超过 5 个即失败', () => {
    const status = evaluateStage(event, 'stage-1', makePredictor('p', { 'stage-1': failingSwissPick() }))!
    expect(status.correctCount).toBe(4)
    expect(status.impossibleCount).toBe(6)
    expect(status.passed).toBe(false)
  })

  it('结果未完整且未达线时未决', () => {
    const progress = emptySwissResult()
    progress['1-0'] = ['A']

    const partialEvent = makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, progress) })
    const status = evaluateStage(
      partialEvent,
      'stage-1',
      makePredictor('p', { 'stage-1': perfectSwissPick() }),
    )!

    expect(status.passed).toBeNull()
    expect(status.isActualResultComplete).toBe(false)
    expect(status.correctCount).toBe(0)
  })

  it('没有该阶段竞猜 → null', () => {
    expect(evaluateStage(event, 'stage-1', makePredictor('p'))).toBeNull()
  })

  it('赛事缺少该阶段数据 → null', () => {
    const event = { ...makeEvent(), 'stage-2': undefined } as unknown as ReturnType<typeof makeEvent>
    expect(
      evaluateStage(event, 'stage-2', makePredictor('p', { 'stage-2': perfectSwissPick() })),
    ).toBeNull()
  })
})

describe('evaluateStage - 决胜阶段', () => {
  const event = makeEvent({ playoffs: makePlayoffsStage([], completePlayoffsResult()) })

  it('八进四：猜中 2 个即通过', () => {
    const status = evaluateStage(
      event,
      '8-to-4',
      makePredictor('p', { playoffs: { '8-to-4': ['A', 'B', 'E', 'F'], '4-to-2': [], '2-to-1': null } }),
    )!
    expect(status.correctCount).toBe(2)
    expect(status.impossibleCount).toBe(2)
    expect(status.passed).toBe(true)
  })

  it('八进四：3 个错误即失败', () => {
    const status = evaluateStage(
      event,
      '8-to-4',
      makePredictor('p', { playoffs: { '8-to-4': ['A', 'E', 'F', 'G'], '4-to-2': [], '2-to-1': null } }),
    )!
    expect(status.correctCount).toBe(1)
    expect(status.impossibleCount).toBe(3)
    expect(status.passed).toBe(false)
  })

  it('八进四：够线后剩余待定也算通过', () => {
    const status = evaluateStage(
      event,
      '8-to-4',
      makePredictor('p', { playoffs: { '8-to-4': ['A', 'B', 'Z', 'Y'], '4-to-2': [], '2-to-1': null } }),
    )!
    expect(status.passed).toBe(true)
  })

  it('半决赛：中 1 个即通过，全错失败', () => {
    const pass = evaluateStage(
      event,
      '4-to-2',
      makePredictor('p', { playoffs: { '8-to-4': [], '4-to-2': ['A', 'C'], '2-to-1': null } }),
    )!
    expect(pass.correctCount).toBe(1)
    expect(pass.passed).toBe(true)

    const fail = evaluateStage(
      event,
      '4-to-2',
      makePredictor('p', { playoffs: { '8-to-4': [], '4-to-2': ['C', 'D'], '2-to-1': null } }),
    )!
    expect(fail.impossibleCount).toBe(2)
    expect(fail.passed).toBe(false)
  })

  it('决赛：猜中冠军通过，猜错失败', () => {
    const pass = evaluateStage(
      event,
      '2-to-1',
      makePredictor('p', { playoffs: { '8-to-4': [], '4-to-2': [], '2-to-1': 'A' } }),
    )!
    expect(pass.passed).toBe(true)
    expect(pass.totalCount).toBe(1)

    const fail = evaluateStage(
      event,
      '2-to-1',
      makePredictor('p', { playoffs: { '8-to-4': [], '4-to-2': [], '2-to-1': 'B' } }),
    )!
    expect(fail.passed).toBe(false)
  })

  it('未填冠军 → 视为没有竞猜', () => {
    expect(
      evaluateStage(
        event,
        '2-to-1',
        makePredictor('p', { playoffs: { '8-to-4': [], '4-to-2': [], '2-to-1': null } }),
      ),
    ).toBeNull()
  })
})

describe('evaluatePredictor', () => {
  it('汇总所有已竞猜任务的成绩', () => {
    const event = makeEvent({
      'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
      playoffs: makePlayoffsStage([], completePlayoffsResult()),
    })

    const predictor = makePredictor('p', {
      'stage-1': perfectSwissPick(),
      playoffs: { '8-to-4': ['A', 'B', 'C', 'D'], '4-to-2': ['A', 'B'], '2-to-1': 'A' },
    })

    const stats = evaluatePredictor(event, predictor)
    expect(stats.stageResults.map((s) => s.stageId)).toEqual([
      'stage-1',
      '8-to-4',
      '4-to-2',
      '2-to-1',
    ])
    expect(stats.totalStages).toBe(4)
    expect(stats.totalPassed).toBe(4)
    expect(stats.totalCorrect).toBe(10 + 4 + 2 + 1)
    expect(stats.totalPredictions).toBe(10 + 4 + 2 + 1)
  })

  it('只统计有竞猜的阶段', () => {
    const event = makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()) })
    const stats = evaluatePredictor(event, makePredictor('p', { 'stage-1': passingSwissPick() }))

    expect(stats.totalStages).toBe(1)
    expect(stats.totalPredictions).toBe(10)
    expect(stats.totalPassed).toBe(1)
  })

  it('没有任何竞猜时全为 0', () => {
    const stats = evaluatePredictor(makeEvent(), makePredictor('p'))
    expect(stats.stageResults).toEqual([])
    expect(stats.totalStages).toBe(0)
    expect(stats.totalCorrect).toBe(0)
    expect(stats.totalPredictions).toBe(0)
  })
})

describe('hasPredictionForStage', () => {
  const predictor = makePredictor('p', {
    'stage-1': perfectSwissPick(),
    playoffs: { '8-to-4': ['A', 'B', 'C', 'D'], '4-to-2': ['A'], '2-to-1': null },
  })

  it('瑞士轮看阶段对象', () => {
    expect(hasPredictionForStage(predictor, 'stage-1')).toBe(true)
    expect(hasPredictionForStage(predictor, 'stage-2')).toBe(false)
  })

  it('决胜阶段看具体轮次', () => {
    expect(hasPredictionForStage(predictor, '8-to-4')).toBe(true)
    expect(hasPredictionForStage(predictor, '4-to-2')).toBe(true)
    expect(hasPredictionForStage(predictor, '2-to-1')).toBe(false)
  })
})
