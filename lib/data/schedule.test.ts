import { expect, test } from 'vitest'
import { getScheduleDays, isToday } from '@/lib/data/schedule'

import type { MajorEvent, Match } from '@/types'

/** 构造一个只含 stage-1 赛程的最小赛事 */
function buildEvent(matches: Match[]): MajorEvent {
  const stage = {
    name: '第一阶段',
    teams: [],
    result: {},
  }

  return {
    id: 'test',
    name: 'Test Major',
    shortName: 'Test',
    current: 'stage-1',
    teams: [],
    'stage-1': { ...stage, schedule: { matches } },
    'stage-2': stage,
    'stage-3': stage,
    playoffs: { teams: [], result: {} },
  } as unknown as MajorEvent
}

function match(partial: Partial<Match> & Pick<Match, 'id' | 'start'>): Match {
  return { format: 'bo1', teamA: null, teamB: null, score: null, winner: null, ...partial }
}

test('待定对局不会被判为进行中', () => {
  const event = buildEvent([match({ id: 'a', start: '2026-11-24T01:00:00Z', format: 'bo1' })])
  const day = getScheduleDays(event)[0]

  expect(day.matches[0].status).toBe('upcoming')
  expect(day.matches[0].teamsPending).toBe(true)
  expect(day.resolved).toBe(false)
})

test('按天分组，天内按时间升序，天间按日期升序', () => {
  const event = buildEvent([
    match({ id: 'c', start: '2026-11-25T04:00:00Z', teamA: 'E', teamB: 'F' }),
    match({ id: 'b', start: '2026-11-24T06:00:00Z', teamA: 'C', teamB: 'D' }),
    match({ id: 'a', start: '2026-11-24T04:00:00Z', teamA: 'A', teamB: 'B' }),
  ])

  const days = getScheduleDays(event)

  expect(days.map((day) => day.dateKey)).toEqual(['2026-11-24', '2026-11-25'])
  expect(days[0].matches.map((item) => item.match.id)).toEqual(['a', 'b'])
  expect(days[0].resolved).toBe(true)
})

test('按赛事时区分天，而不是按 UTC', () => {
  const event = buildEvent([
    match({ id: 'a', start: '2026-11-24T16:30:00Z', teamA: 'A', teamB: 'B' }), // 北京 11-25 00:30
  ])

  expect(getScheduleDays(event)[0].dateKey).toBe('2026-11-25')
})

test('isToday 按赛事时区判断', () => {
  const now = new Date('2026-11-24T02:00:00Z') // 北京 11-24 10:00

  expect(isToday('2026-11-24', 'Asia/Shanghai', now)).toBe(true)
  expect(isToday('2026-11-25', 'Asia/Shanghai', now)).toBe(false)
})
