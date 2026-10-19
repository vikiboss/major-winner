import { describe, expect, it } from 'vitest'

import { getRankedTeams, getTeamPerformance, getTeamStatus } from '@/lib/team'

import {
  completePlayoffsResult,
  completeSwissResult,
  emptySwissResult,
  makeEvent,
  makePlayoffsStage,
  makeSwissStage,
  SWISS_TEAMS,
} from '../tests/fixtures'

const PLAYOFF_TEAMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const completeEvent = () =>
  makeEvent({
    'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
    playoffs: makePlayoffsStage(PLAYOFF_TEAMS, completePlayoffsResult()),
  })

/* -------------------------------------------------------------------------- */
/*                                表现轨迹                                     */
/* -------------------------------------------------------------------------- */

describe('getTeamPerformance', () => {
  it('冠军：瑞士轮晋级 + 决赛冠军', () => {
    const performance = getTeamPerformance(completeEvent(), 'A')

    expect(performance).toEqual([
      { stage: 'stage-1', stageName: '🧗‍♂️ 挑战组', result: '3-0', status: 'advanced' },
      { stage: 'playoffs', stageName: '决赛', result: '冠军', status: 'champion' },
    ])
  })

  it('亚军：决赛落败记为 advanced', () => {
    const performance = getTeamPerformance(completeEvent(), 'B')
    expect(performance.at(-1)).toMatchObject({ stageName: '决赛', result: '亚军', status: 'advanced' })
  })

  it('四强：半决赛落败', () => {
    const performance = getTeamPerformance(completeEvent(), 'C')
    expect(performance.at(-1)).toMatchObject({ stageName: '半决赛', result: '四强', status: 'eliminated' })
  })

  it('八强：八进四落败', () => {
    const performance = getTeamPerformance(completeEvent(), 'E')
    expect(performance.at(-1)).toMatchObject({ stageName: '八进四', result: '八强', status: 'eliminated' })
  })

  it('瑞士轮淘汰只有一条记录', () => {
    const performance = getTeamPerformance(completeEvent(), 'I')
    expect(performance).toEqual([
      { stage: 'stage-1', stageName: '🧗‍♂️ 挑战组', result: '2-3', status: 'eliminated' },
    ])
  })

  it('进行中的战绩标记为 in-progress', () => {
    const result = emptySwissResult()
    result['1-0'] = ['A']

    const performance = getTeamPerformance(
      makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, result) }),
      'A',
    )
    expect(performance).toEqual([
      { stage: 'stage-1', stageName: '🧗‍♂️ 挑战组', result: '1-0', status: 'in-progress' },
    ])
  })

  it('尚未开赛的队伍标记为 waiting', () => {
    const performance = getTeamPerformance(makeEvent(), 'A')
    expect(performance).toEqual([
      { stage: 'stage-1', stageName: '🧗‍♂️ 挑战组', result: '待赛', status: 'waiting' },
    ])
  })

  it('决胜阶段未开打时显示待赛', () => {
    const performance = getTeamPerformance(
      makeEvent({
        'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        playoffs: makePlayoffsStage(PLAYOFF_TEAMS),
      }),
      'A',
    )
    expect(performance.at(-1)).toMatchObject({ stageName: '八进四', result: '待赛', status: 'waiting' })
  })

  it('晋级四强后等待半决赛', () => {
    const result = completePlayoffsResult()
    // 半决赛已开打（已有一方出局），但 A 还没上场
    result['4-to-2'] = { winners: [], losers: ['C', 'D'] }
    result['2-to-1'] = { winner: null, loser: null }

    const performance = getTeamPerformance(
      makeEvent({
        'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
        playoffs: makePlayoffsStage(PLAYOFF_TEAMS, result),
      }),
      'A',
    )

    expect(performance.at(-2)).toMatchObject({ result: '晋级四强', status: 'advanced' })
    expect(performance.at(-1)).toMatchObject({ stageName: '半决赛', result: '待赛', status: 'waiting' })
  })

  it('不在本阶段的队伍不产生记录', () => {
    expect(getTeamPerformance(makeEvent({ 'stage-1': makeSwissStage(['A']) }), 'B')).toEqual([])
  })
})

/* -------------------------------------------------------------------------- */
/*                                  状态                                       */
/* -------------------------------------------------------------------------- */

describe('getTeamStatus', () => {
  it('根据最后一条记录给出文案与色调', () => {
    const cases: [string, string, string][] = [
      ['A', '🏆 冠军', 'champion'],
      ['B', '🥈 亚军', 'runner-up'],
      ['C', '❌ 已淘汰', 'eliminated'],
      ['I', '❌ 已淘汰', 'eliminated'],
    ]

    for (const [team, text, tone] of cases) {
      const status = getTeamStatus(getTeamPerformance(completeEvent(), team))
      expect(status).toEqual({ text, tone })
    }
  })

  it('没有记录时是未开赛', () => {
    expect(getTeamStatus([])).toEqual({ text: '未开赛', tone: 'idle' })
  })

  it('赛程中与等待中的区分', () => {
    const result = emptySwissResult()
    result['1-0'] = ['A']
    result['3-0'] = ['B', 'C']

    const event = makeEvent({ 'stage-1': makeSwissStage(SWISS_TEAMS, result) })
    expect(getTeamStatus(getTeamPerformance(event, 'A'))).toEqual({ text: '赛程中', tone: 'in-progress' })
    expect(getTeamStatus(getTeamPerformance(event, 'B'))).toEqual({ text: '已晋级', tone: 'advanced' })
    expect(getTeamStatus(getTeamPerformance(event, 'P'))).toEqual({ text: '等待中', tone: 'waiting' })
  })
})

/* -------------------------------------------------------------------------- */
/*                                  排序                                       */
/* -------------------------------------------------------------------------- */

describe('getRankedTeams', () => {
  const ranked = getRankedTeams(completeEvent())
  const indexOf = (id: string) => ranked.findIndex((team) => team.id === id)

  it('包含全部参赛队伍', () => {
    expect(ranked).toHaveLength(SWISS_TEAMS.length)
  })

  it('冠军 > 亚军 > 四强 > 八强 > 淘汰', () => {
    expect(indexOf('A')).toBeLessThan(indexOf('B'))
    expect(indexOf('B')).toBeLessThan(indexOf('C'))
    expect(indexOf('C')).toBeLessThan(indexOf('E'))
    expect(indexOf('E')).toBeLessThan(indexOf('I'))
  })

  it('瑞士轮晋级但未进决胜阶段的队伍排在淘汰队伍之前', () => {
    const event = makeEvent({
      'stage-1': makeSwissStage(SWISS_TEAMS, completeSwissResult()),
      playoffs: makePlayoffsStage(['A', 'B', 'C', 'D'], completePlayoffsResult()),
    })
    const list = getRankedTeams(event)
    const idx = (id: string) => list.findIndex((team) => team.id === id)

    // E/F/G/H 3-1/3-2 晋级但没进八强，仍应排在 1-3 淘汰的 L 之前
    expect(idx('E')).toBeLessThan(idx('L'))
  })

  it('输出包含表现与状态', () => {
    const champion = ranked[0]
    expect(champion.id).toBe('A')
    expect(champion.status.tone).toBe('champion')
    expect(champion.performance.length).toBeGreaterThan(0)
  })
})
