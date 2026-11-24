import { describe, expect, it } from 'vitest'

import { createBracket, getBracketProgress, seedBracket } from '@/lib/data/swiss-bracket'
import {
  buildStateFromResult,
  deriveSwissFixture,
  getFrontierRound,
  getStageRecords,
} from '@/lib/data/swiss-fixture'

import type { SwissMatch, SwissResult } from '@/types'

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

  it('只有战绩、没有对阵明细时，不声称自己还原了完整赛程', () => {
    expect(fixture.consistent).toBe(true)
    expect(fixture.explicit).toBe(false)
    expect(fixture.rounds).toBe(2)
  })

  it('只锁定所有解都一致的场次，不臆造对阵', () => {
    // 同一份战绩对应两种 R1 排法（差别在 FaZe 那场），交集里只留下共有的对阵
    expect(fixture.matches.length).toBeLessThan(16)

    const pairs = fixture.matches.map((match) => [match.teamA, match.teamB].toSorted().join('-'))
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('有歧义的对阵不会被锁定（回归：FaZe 其实没打过 Wildcard）', () => {
    // 真实情况是 FaZe 打 BCG，而按种子同位对位会得出 FaZe-Wildcard；
    // 两种解都成立，所以这些场次一律不锁定，交给推演
    const fazeMatches = fixture.matches.filter(
      (match) => match.teamA === 'FaZe' || match.teamB === 'FaZe',
    )

    expect(fazeMatches.every((match) => match.winner && match.round)).toBe(true)
    expect(
      fixture.matches.some((m) => [m.teamA, m.teamB].toSorted().join('-') === 'FaZe-Wildcard'),
    ).toBe(false)
  })

  it('锁定的场次都来自参赛名单、同轮不重复出场', () => {
    for (const round of [1, 2]) {
      const played = fixture.matches
        .filter((match) => match.round === round)
        .flatMap((match) => [match.teamA!, match.teamB!])

      expect(new Set(played).size).toBe(played.length)
      expect(played.every((id) => TEAMS.includes(id))).toBe(true)
    }
  })

  it('锁定的胜场不会超过登记的战绩', () => {
    const registered = getStageRecords(TWO_ROUNDS)
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

    for (const [id, record] of Object.entries(registered)) {
      expect(wins[id], id).toBeLessThanOrEqual(record.wins)
      expect(losses[id], id).toBeLessThanOrEqual(record.losses)
    }
  })

  it('没有任何结果时不反推', () => {
    expect(deriveSwissFixture(TEAMS, undefined)).toEqual({
      matches: [],
      rounds: 0,
      consistent: true,
      explicit: false,
    })
  })

  it('战绩与已打轮次矛盾时标记为不自洽', () => {
    // 2-0 以外被写成 3-0：两轮不可能打出 3 胜
    const broken: SwissResult = { ...TWO_ROUNDS, '2-0': [], '3-0': ['M80'] }

    const result = deriveSwissFixture(TEAMS, broken)
    expect(result.consistent).toBe(false)
    expect(result.rounds).toBe(0)
  })
})

describe('deriveSwissFixture - 真实赛程', () => {
  it('给了对局明细就直接采用，不再猜对阵', () => {
    // ['胜者', '败者']
    const matches: SwissMatch[] = [['FaZe', 'BCG']]
    const fixture = deriveSwissFixture(TEAMS, TWO_ROUNDS, matches)

    expect(fixture.explicit).toBe(true)
    expect(fixture.rounds).toBe(1)
    expect(fixture.matches[0]).toMatchObject({ teamA: 'FaZe', teamB: 'BCG', winner: 'FaZe' })
  })

  it('轮次按比赛顺序推算：每 8 场一轮', () => {
    const matches: SwissMatch[] = Array.from(
      { length: 16 },
      (_, i) => [TEAMS[i], TEAMS[i + 8]] as SwissMatch,
    )

    const fixture = deriveSwissFixture(TEAMS, undefined, matches)

    expect(fixture.rounds).toBe(2)
    expect(fixture.matches.slice(0, 8).every((m) => m.round === 1)).toBe(true)
    expect(fixture.matches.slice(8, 16).every((m) => m.round === 2)).toBe(true)
  })
})

describe('buildStateFromResult', () => {
  const state = buildStateFromResult(TEAMS, TWO_ROUNDS)

  it('能确定的真实结果被锁定，且覆盖到第 2 轮', () => {
    const locked = state.matches.filter((match) => match.locked)

    expect(locked.length).toBeGreaterThan(0)
    expect(locked.length).toBeLessThanOrEqual(16)
    expect(locked.every((match) => match.round! <= 2)).toBe(true)
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
    expect(
      seeded.matches.filter((match) => match.locked).every((match) => match.winner === match.a),
    ).toBe(true)
  })
})
