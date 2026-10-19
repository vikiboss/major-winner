import { describe, expect, it } from 'vitest'

import {
  getCurrentStage,
  getEventProgress,
  getRoundProgress,
  getStageProgress,
} from '@/lib/data/progress'

import {
  completePlayoffsResult,
  completeSwissResult,
  emptyPlayoffsResult,
  emptySwissResult,
  makeEvent,
  makePlayoffsStage,
  makeSwissStage,
  SWISS_TEAMS,
} from '../../tests/fixtures'

const PLAYOFF_TEAMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/* -------------------------------------------------------------------------- */
/*                                 单轮进度                                    */
/* -------------------------------------------------------------------------- */

describe('getRoundProgress', () => {
  it('没有决胜阶段数据时全部未开始', () => {
    expect(getRoundProgress(undefined, '8-to-4')).toEqual({ hasResults: false, isComplete: false })
  })

  it('八进四部分结果 → 有结果但未完成', () => {
    const result = completePlayoffsResult()
    result['8-to-4'].winners = ['A', 'B']

    const progress = getRoundProgress(makePlayoffsStage(PLAYOFF_TEAMS, result), '8-to-4')
    expect(progress.hasResults).toBe(true)
    expect(progress.isComplete).toBe(false)
  })

  it('八进四 4 支晋级 → 完成', () => {
    const progress = getRoundProgress(
      makePlayoffsStage(PLAYOFF_TEAMS, completePlayoffsResult()),
      '8-to-4',
    )
    expect(progress).toEqual({ hasResults: true, isComplete: true })
  })

  it('决赛只看冠军是否产生', () => {
    const result = completePlayoffsResult()
    result['2-to-1'] = { winner: null, loser: null }

    const progress = getRoundProgress(makePlayoffsStage(PLAYOFF_TEAMS, result), '2-to-1')
    expect(progress).toEqual({ hasResults: false, isComplete: false })
  })

  it('只有败者记录也算有结果', () => {
    const result = emptyPlayoffsResult()
    result['4-to-2'].losers = ['C', 'D']

    const progress = getRoundProgress(makePlayoffsStage(PLAYOFF_TEAMS, result), '4-to-2')
    expect(progress.hasResults).toBe(true)
    expect(progress.isComplete).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/*                                 阶段进度                                    */
/* -------------------------------------------------------------------------- */

describe('getStageProgress - 瑞士轮', () => {
  it('无结果 → not_started', () => {
    const progress = getStageProgress(makeEvent(), 'stage-1')
    expect(progress).toMatchObject({
      stageId: 'stage-1',
      stageName: '第一阶段',
      status: 'not_started',
      hasResults: false,
      isResultsComplete: false,
    })
  })

  it('只有进行中战绩 → in_progress', () => {
    const result = emptySwissResult()
    result['1-0'] = ['A']

    const progress = getStageProgress(
      makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, result) }),
      'stage-1',
    )
    expect(progress.status).toBe('in_progress')
    expect(progress.isResultsComplete).toBe(false)
  })

  it('结果完整 → completed', () => {
    const progress = getStageProgress(
      makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()) }),
      'stage-1',
    )
    expect(progress.status).toBe('completed')
    expect(progress.isResultsComplete).toBe(true)
  })
})

describe('getStageProgress - 决胜阶段', () => {
  it('无结果 → not_started', () => {
    expect(getStageProgress(makeEvent(), 'playoffs').status).toBe('not_started')
  })

  it('任意一轮有结果 → in_progress', () => {
    const result = completePlayoffsResult()
    result['4-to-2'] = { winners: [], losers: [] }
    result['2-to-1'] = { winner: null, loser: null }

    const progress = getStageProgress(makeEvent({ playoffs: makePlayoffsStage([], result) }), 'playoffs')
    expect(progress.status).toBe('in_progress')
    expect(progress.hasResults).toBe(true)
    expect(progress.isResultsComplete).toBe(false)
  })

  it('三轮全部结束 → completed', () => {
    const progress = getStageProgress(
      makeEvent({ playoffs: makePlayoffsStage([], completePlayoffsResult()) }),
      'playoffs',
    )
    expect(progress.status).toBe('completed')
    expect(progress.isResultsComplete).toBe(true)
  })
})

/* -------------------------------------------------------------------------- */
/*                                 赛事进度                                    */
/* -------------------------------------------------------------------------- */

describe('getEventProgress', () => {
  it('全部未开始', () => {
    const progress = getEventProgress(makeEvent())

    expect(progress.hasResults).toBe(false)
    expect(progress.isCompleted).toBe(false)
    expect(progress.currentStage).toBe('stage-1')
    expect(progress.completedStages).toEqual([])
    expect(progress.stages.map((s) => s.status)).toEqual([
      'not_started',
      'not_started',
      'not_started',
      'not_started',
    ])
  })

  it('第一阶段结束后进入第二阶段', () => {
    const progress = getEventProgress(
      makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()) }),
    )

    expect(progress.completedStages).toEqual(['stage-1'])
    expect(progress.currentStage).toBe('stage-2')
    expect(progress.isCompleted).toBe(false)
  })

  it('瑞士轮全部结束、决胜阶段未开始', () => {
    const progress = getEventProgress(
      makeEvent({
        'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        'stage-2': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        'stage-3': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
      }),
    )

    expect(progress.completedStages).toEqual(['stage-1', 'stage-2', 'stage-3'])
    expect(progress.currentStage).toBe('playoffs')
  })

  it('赛事全部结束 → currentStage 为 null', () => {
    const progress = getEventProgress(
      makeEvent({
        'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        'stage-2': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        'stage-3': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        playoffs: makePlayoffsStage(PLAYOFF_TEAMS, completePlayoffsResult()),
      }),
    )

    expect(progress.isCompleted).toBe(true)
    expect(progress.currentStage).toBeNull()
    expect(progress.completedStages).toHaveLength(4)
  })
})

describe('getCurrentStage', () => {
  it('未开始时指向第一阶段', () => {
    expect(getCurrentStage(makeEvent())).toBe('stage-1')
  })

  it('第一阶段结束后指向第二阶段', () => {
    expect(
      getCurrentStage(makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()) })),
    ).toBe('stage-2')
  })

  it('全部结束后停在决胜阶段', () => {
    expect(
      getCurrentStage(
        makeEvent({
          'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
          'stage-2': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
          'stage-3': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
          playoffs: makePlayoffsStage(PLAYOFF_TEAMS, completePlayoffsResult()),
        }),
      ),
    ).toBe('playoffs')
  })
})
