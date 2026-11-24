import { describe, expect, it } from 'vitest'

import { createBracket, getBracketProgress, seedBracket } from '@/lib/data/swiss-bracket'
import {
  buildStateFromResult,
  deriveSwissFixture,
  getFrontierRound,
  getStageRecords,
} from '@/lib/data/swiss-fixture'

import type { SwissResult } from '@/types'

/** 新加坡 2026 第一阶段：R1、R2 已打完，登记到 2-0 / 1-1 / 0-2 */
const TEAMS = [
  'NIP',
  'PV',
  'HEROIC',
  'FaZe',
  'Liquid',
  'EF',
  '100T',
  '9z',
  'M80',
  'DENDELE',
  'Imperial',
  'Wildcard',
  'BCG',
  'FlyQuest',
  'CW',
  'LVG',
]

const TWO_ROUNDS: SwissResult = {
  '1-0': [],
  '0-1': [],
  '1-1': ['LVG', 'HEROIC', 'M80', '100T', 'EF', 'PV', 'FaZe', 'Wildcard'],
  '2-0': ['NIP', 'Imperial', 'FlyQuest', 'Liquid'],
  '0-2': ['CW', '9z', 'DENDELE', 'BCG'],
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

describe('getStageRecords', () => {
  it('进行中与已定稿的战绩都会收进来', () => {
    const records = getStageRecords({ ...TWO_ROUNDS, '3-0': ['NIP'], '2-0': ['Imperial'] })

    expect(records.NIP).toEqual({ wins: 3, losses: 0 })
    expect(records.Imperial).toEqual({ wins: 2, losses: 0 })
  })

  it('没有结果时返回空表', () => {
    expect(getStageRecords(undefined)).toEqual({})
  })
})

describe('deriveSwissFixture', () => {
  const fixture = deriveSwissFixture(TEAMS, TWO_ROUNDS)

  it('还原出前两轮的 16 场，且结果是自洽的', () => {
    expect(fixture.consistent).toBe(true)
    expect(fixture.rounds).toBe(2)
    expect(fixture.matches).toHaveLength(16)
    expect(fixture.matches.every((match) => match.round! <= 2)).toBe(true)
  })

  it('每场比赛的两支队伍都来自参赛名单，且同轮不重复出场', () => {
    for (const round of [1, 2]) {
      const played = fixture.matches
        .filter((match) => match.round === round)
        .flatMap((match) => [match.teamA!, match.teamB!])

      expect(played).toHaveLength(16)
      expect(new Set(played).size).toBe(16)
      expect(played.every((id) => TEAMS.includes(id))).toBe(true)
    }
  })

  it('反推出的战绩与登记的完全一致', () => {
    const wins: Record<string, number> = {}
    const losses: Record<string, number> = {}
    for (const id of TEAMS) {
      wins[id] = 0
      losses[id] = 0
    }

    for (const match of fixture.matches) {
      wins[match.winner!]++
      losses[match.winner === match.teamA ? match.teamB! : match.teamA!]++
    }

    const registered = getStageRecords(TWO_ROUNDS)
    for (const id of TEAMS) {
      expect(`${wins[id]}-${losses[id]}`, id).toBe(
        `${registered[id].wins}-${registered[id].losses}`,
      )
    }
  })

  it('第 1 轮按官方赛制：种子两半同位对位', () => {
    const round1 = fixture.matches.filter((match) => match.round === 1)

    expect(round1.map((match) => [match.teamA, match.teamB])).toEqual([
      ['NIP', 'M80'],
      ['PV', 'DENDELE'],
      ['HEROIC', 'Imperial'],
      ['FaZe', 'Wildcard'],
      ['Liquid', 'BCG'],
      ['EF', 'FlyQuest'],
      ['100T', 'CW'],
      ['9z', 'LVG'],
    ])
  })

  it('没有任何结果时不反推', () => {
    expect(deriveSwissFixture(TEAMS, undefined)).toEqual({
      matches: [],
      rounds: 0,
      consistent: true,
    })
  })

  it('战绩与已打轮次矛盾时标记为不自洽', () => {
    // 2-0 以外的队伍被写成 3-0：两轮不可能打出 3 胜
    const broken: SwissResult = { ...TWO_ROUNDS, '2-0': [], '3-0': ['M80'] }

    const result = deriveSwissFixture(TEAMS, broken)
    expect(result.consistent).toBe(false)
    expect(result.rounds).toBe(0)
  })
})

describe('buildStateFromResult', () => {
  const state = buildStateFromResult(TEAMS, TWO_ROUNDS)

  it('真实结果全部锁定，且锁定场次覆盖到第 2 轮', () => {
    const locked = state.matches.filter((match) => match.locked)

    expect(locked).toHaveLength(16)
    expect(getFrontierRound(state)).toBe(2)
  })

  it('面板仍是完整的 33 场，每场都有胜者', () => {
    expect(state.matches).toHaveLength(33)
    expect(state.matches.every((match) => match.winner !== null)).toBe(true)
    expect(getBracketProgress(state).done).toBe(true)
  })

  it('没有真实结果时退化为默认剧本', () => {
    const blank = buildStateFromResult(TEAMS)

    expect(getFrontierRound(blank)).toBe(1)
    expect(blank.matches.filter((match) => match.locked)).toHaveLength(0)
    expect(blank.matches).toHaveLength(33)
  })
})

describe('seedBracket', () => {
  it('推演表已有默认胜者时，仍能逐场锁定真实结果', () => {
    // 回归：之前用 `if (item.winner) return false` 找空场次，
    // 而推演表每场都已按默认剧本填了胜者，导致只锁住第一场
    const base = createBracket(TEAMS)
    const real = base.matches.map((match, index) => ({
      id: `${match.id}-real`,
      start: '',
      round: 1,
      group: match.group,
      format: match.format,
      teamA: match.a,
      teamB: match.b,
      winner: match.a,
      no: index + 1,
    }))

    const seeded = seedBracket(base, real)

    expect(seeded.matches.filter((match) => match.locked)).toHaveLength(8)
    expect(seeded.matches.filter((match) => match.locked).every((match) => match.winner === match.a))
      .toBe(true)
  })
})
