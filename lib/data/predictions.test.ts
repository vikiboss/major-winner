import { describe, expect, it } from 'vitest'

import {
  buildRows,
  countParticipants,
  createRows,
  createStageViews,
  getEventPredictions,
  getPreviewRows,
  getStageViews,
} from '@/lib/data/predictions'
import { eventSummaries } from '@/lib/data/store'

import {
  completePlayoffsResult,
  completeSwissResult,
  failingSwissPick,
  makeEvent,
  makePlayoffsStage,
  makePredictor,
  makeStatsMap,
  makeSwissStage,
  passingSwissPick,
  perfectSwissPick,
  SWISS_TEAMS,
} from '../../tests/fixtures'

import type { PredictorPrediction } from '@/types'

const PLAYOFF_TEAMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function swissPredictions(): PredictorPrediction[] {
  return [
    makePredictor('p1', { 'stage-1': perfectSwissPick() }),
    makePredictor('p2', { 'stage-1': passingSwissPick() }),
    makePredictor('p3', { 'stage-1': failingSwissPick() }),
    makePredictor('p4'),
  ]
}

/* -------------------------------------------------------------------------- */
/*                                  表格行                                     */
/* -------------------------------------------------------------------------- */

describe('createRows - 瑞士轮', () => {
  const event = makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()) })
  const predictions = swissPredictions()
  const rows = createRows(event, predictions, makeStatsMap(event, predictions), 'stage-1')

  it('只包含参与了该阶段的竞猜者', () => {
    expect(rows.map((row) => row.predictor.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('按猜对数降序排列', () => {
    expect(rows.map((row) => row.stage?.correctCount)).toEqual([10, 5, 4])
  })

  it('每组三个竞猜分组，标签固定', () => {
    expect(rows[0].groups.map((group) => group.label)).toEqual(['3-0', '3-X', '0-3'])
    expect(rows[0].groups.every((group) => group.taskId === 'stage-1')).toBe(true)
  })

  it('分组内队伍带胜负态', () => {
    const [top] = rows
    expect(top.groups[0].teams).toEqual([
      { id: 'A', outcome: 'win' },
      { id: 'B', outcome: 'win' },
    ])
    expect(top.groups[2].teams.every((team) => team.outcome === 'win')).toBe(true)
  })

  it('同一列队伍按被选中次数排序', () => {
    // A 被 p1/p2/p3 选中，F 只被 p3 选中
    const p3Row = rows.find((row) => row.predictor.id === 'p3')!
    expect(p3Row.groups[0].teams.map((team) => team.id)).toEqual(['A', 'F'])
  })

  it('未竞猜该阶段的竞猜者不产生行', () => {
    const onlyP4 = createRows(event, [makePredictor('p4')], new Map(), 'stage-1')
    expect(onlyP4).toEqual([])
  })
})

describe('createRows - 决胜阶段', () => {
  const event = makeEvent({ playoffs: makePlayoffsStage(PLAYOFF_TEAMS, completePlayoffsResult()) })
  const predictions = [
    makePredictor('p1', {
      playoffs: { '8-to-4': ['A', 'B', 'C', 'D'], '4-to-2': ['A', 'B'], '2-to-1': 'A' },
    }),
    makePredictor('p2', {
      playoffs: { '8-to-4': ['E', 'F', 'G', 'H'], '4-to-2': ['C', 'D'], '2-to-1': 'B' },
    }),
    makePredictor('p3', {
      playoffs: { '8-to-4': ['A', 'B', 'E', 'F'], '4-to-2': ['A', 'C'], '2-to-1': 'A' },
    }),
  ]
  const rows = createRows(event, predictions, makeStatsMap(event, predictions), 'playoffs')

  it('三轮竞猜合并成三组', () => {
    expect(rows[0].groups.map((group) => group.label)).toEqual(['四强', '二强', '冠军'])
  })

  it('聚合成绩按三轮累加', () => {
    const p1 = rows.find((row) => row.predictor.id === 'p1')!
    expect(p1.aggregate).toEqual({ passed: 3, failed: 0, correct: 7, impossible: 0 })

    const p2 = rows.find((row) => row.predictor.id === 'p2')!
    expect(p2.aggregate.passed).toBe(0)
    expect(p2.aggregate.failed).toBe(3)
    expect(p2.aggregate.correct).toBe(0)
  })

  it('按通过数、错误数、猜对数排序', () => {
    expect(rows.map((row) => row.predictor.id)).toEqual(['p1', 'p3', 'p2'])
  })

  it('未提交决胜阶段竞猜的竞猜者不产生行', () => {
    const rows = createRows(
      event,
      [makePredictor('p', { 'stage-1': perfectSwissPick() })],
      new Map(),
      'playoffs',
    )
    expect(rows).toEqual([])
  })
})

/* -------------------------------------------------------------------------- */
/*                                 阶段视图                                    */
/* -------------------------------------------------------------------------- */

function pickAllStages(): PredictorPrediction {
  return makePredictor('p', {
    'stage-1': perfectSwissPick(),
    'stage-2': perfectSwissPick(),
    'stage-3': perfectSwissPick(),
    playoffs: { '8-to-4': ['A', 'B', 'C', 'D'], '4-to-2': ['A', 'B'], '2-to-1': 'A' },
  })
}

describe('createStageViews', () => {
  it('有竞猜无结果：瑞士轮等待，决胜阶段逐轮解锁', () => {
    const views = createStageViews(makeEvent(), [pickAllStages()])
    const byId = Object.fromEntries(views.map((view) => [view.id, view]))

    expect(byId['stage-1']).toMatchObject({ status: 'waiting', visible: true, kind: 'swiss' })
    expect(byId['8-to-4']).toMatchObject({ status: 'waiting', visible: true, kind: 'playoffs' })
    // 八进四没结束，后续轮次不应提前露出
    expect(byId['4-to-2']).toMatchObject({ status: 'not_started', visible: false })
    expect(byId['2-to-1']).toMatchObject({ status: 'not_started', visible: false })
  })

  it('无竞猜无结果的阶段不显示', () => {
    const views = createStageViews(makeEvent(), [makePredictor('p', { 'stage-1': perfectSwissPick() })])
    const byId = Object.fromEntries(views.map((view) => [view.id, view]))

    expect(byId['stage-1'].visible).toBe(true)
    expect(byId['stage-2']).toMatchObject({ status: 'not_started', visible: false })
    expect(byId['8-to-4'].visible).toBe(false)
  })

  it('八进四结束后解锁半决赛', () => {
    const result = completePlayoffsResult()
    result['4-to-2'] = { winners: [], losers: [] }
    result['2-to-1'] = { winner: null, loser: null }

    const views = createStageViews(
      makeEvent({ playoffs: makePlayoffsStage(PLAYOFF_TEAMS, result) }),
      [pickAllStages()],
    )
    const byId = Object.fromEntries(views.map((view) => [view.id, view]))

    expect(byId['8-to-4']).toMatchObject({ status: 'completed', hasResults: true })
    expect(byId['4-to-2']).toMatchObject({ status: 'waiting', visible: true })
    expect(byId['2-to-1']).toMatchObject({ status: 'not_started', visible: false })
  })

  it('阶段完成后状态为 completed', () => {
    const views = createStageViews(
      makeEvent({
        'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        playoffs: makePlayoffsStage(PLAYOFF_TEAMS, completePlayoffsResult()),
      }),
      [pickAllStages()],
    )

    expect(views.find((view) => view.id === 'stage-1')?.status).toBe('completed')
    expect(views.find((view) => view.id === '8-to-4')?.status).toBe('completed')
    expect(views.find((view) => view.id === '2-to-1')?.status).toBe('completed')
  })

  it('始终返回六个阶段，顺序固定', () => {
    const views = createStageViews(makeEvent(), [])
    expect(views.map((view) => view.id)).toEqual([
      'stage-1',
      'stage-2',
      'stage-3',
      '8-to-4',
      '4-to-2',
      '2-to-1',
    ])
  })
})

/* -------------------------------------------------------------------------- */
/*                          与真实数据的集成冒烟                                */
/* -------------------------------------------------------------------------- */

describe('真实数据冒烟', () => {
  const eventId = eventSummaries[0]?.id ?? ''

  it('buildRows 输出结构与排序合法', () => {
    const rows = buildRows(eventId, 'stage-1')

    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.groups).toHaveLength(3)
      expect(row.stats.totalStages).toBeGreaterThanOrEqual(0)
    }

    const corrects = rows.map((row) => row.stage?.correctCount ?? 0)
    expect(corrects).toEqual([...corrects].sort((a, b) => b - a))
  })

  it('getPreviewRows 排除比赛结果且受 limit 限制', () => {
    const rows = getPreviewRows(eventId, 'stage-1', 3)

    expect(rows.length).toBeLessThanOrEqual(3)
    expect(rows.some((row) => row.predictor.id === 'cs')).toBe(false)
  })

  it('阶段视图与参与人数可用', () => {
    expect(getStageViews(eventId)).toHaveLength(6)
    expect(countParticipants(eventId, 'stage-1')).toBeLessThanOrEqual(
      getEventPredictions(eventId).length,
    )
    expect(countParticipants(eventId, '8-to-4')).toBeLessThanOrEqual(
      getEventPredictions(eventId).length,
    )
  })
})
