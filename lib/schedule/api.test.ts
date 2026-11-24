import { expect, test } from 'vitest'
import { normalizeMatchList, toMatchTimeParam } from '@/lib/schedule/api'
import { buildScheduleUrl, matchFormat, normalizeSchedule } from '@/lib/schedule/client'
import { dateKeyOf, matchesOfDay, shiftDateKey, matchDateKeys } from '@/lib/schedule/date'

test('normalize filters non-Major & handles TBD/live/finished', () => {
  const list = [
    {
      id: 1,
      startTime: Date.UTC(2026, 10, 24, 4, 5),
      team1DTO: { name: '9z' },
      team2DTO: { name: 'LVG' },
      score1: 11,
      score2: 13,
      bo: 'inf',
      status: 3,
      csgoEventDTO: { name: 'PGL Singapore Major 2026 Stage 1', level: 'major' },
    },
    {
      id: 2,
      startTime: Date.UTC(2026, 10, 24, 10, 45),
      team1DTO: { name: 'EF' },
      team2DTO: { name: 'DENDELE' },
      score1: 0,
      score2: 0,
      bo: 'bo1',
      status: 2,
      csgoEventDTO: { name: 'PGL Singapore Major 2026 Stage 1', level: 'major' },
    },
    {
      id: 3,
      startTime: Date.UTC(2026, 10, 24, 12),
      team1DTO: { name: 'TBD' },
      team2DTO: { name: 'TBD' },
      bo: 'bo1',
      status: 2,
      csgoEventDTO: { name: 'PGL Singapore Major 2026 Stage 1', level: 'major' },
    },
    {
      id: 4,
      startTime: Date.UTC(2026, 10, 24, 1),
      team1DTO: { name: 'A' },
      team2DTO: { name: 'B' },
      bo: 'bo3',
      status: 3,
      score1: 2,
      score2: 0,
      csgoEventDTO: { name: 'CROSSFIRE Season 7', level: 'minor' },
    },
    {
      id: 1,
      startTime: Date.UTC(2026, 10, 24, 4, 5),
      csgoEventDTO: { name: 'PGL Singapore Major 2026 Stage 1', level: 'major' },
    },
    {
      id: 5,
      startTime: Date.UTC(2026, 10, 24, 5),
      team1DTO: { name: 'A' },
      team2DTO: { name: 'B' },
      bo: 'bo1',
      status: 1,
      // 名字带 Major 但等级不是 Major：不再按关键词保留
      csgoEventDTO: { name: 'Major Trial Cup', level: 'minor' },
    },
  ]
  const out = normalizeMatchList(list as any)
  expect(out.map((m) => m.id)).toEqual([1, 2, 3]) // 非 Major 等级丢掉、重复丢掉、按时间升序
  expect(out[0].status).toBe('finished')
  expect(out[0].winner).toBe('LVG')
  expect(out[0].format).toBe('bo1') // bo 是地图代号，按单局局分 11:13 判为 BO1
  expect(out[1].status).toBe('live')
  expect(out[1].format).toBe('bo1')
  expect(out[2].teamA).toBeNull()
  expect(out[2].status).toBe('upcoming') // TBD never "live"
})

test('date helpers', () => {
  expect(shiftDateKey('2026-11-30', 1)).toBe('2026-12-01')
  expect(shiftDateKey('2026-11-01', -1)).toBe('2026-10-31')
  expect(dateKeyOf(new Date(2026, 10, 24, 23, 30).getTime())).toBe('2026-11-24')
  const matches = [
    { id: 1, start: new Date(2026, 10, 24, 12).getTime() },
    { id: 2, start: new Date(2026, 10, 24, 9).getTime() },
    { id: 3, start: new Date(2026, 10, 25, 9).getTime() },
  ] as any
  expect(matchesOfDay(matches, '2026-11-24').map((m: any) => m.id)).toEqual([2, 1])
  expect(matchDateKeys(matches)).toEqual(['2026-11-24', '2026-11-25'])
})

test('matchTime 必须是 YYYY-MM-DD HH:mm:ss（接口只接受这种格式）', () => {
  // 实测：缺秒 / 只有日期都会返回 { code: 10001, message: '参数错误' }
  expect(toMatchTimeParam(new Date(Date.UTC(2026, 10, 24, 0, 0, 0)))).toBe('2026-11-24 00:00:00')
  expect(toMatchTimeParam(new Date(Date.UTC(2026, 0, 5, 7, 8, 9)))).toBe('2026-01-05 07:08:09')

  for (const date of [new Date(), new Date(Date.UTC(2026, 5, 1, 13, 45, 30))]) {
    const param = toMatchTimeParam(date)
    expect(param).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(decodeURIComponent(encodeURIComponent(param))).toBe(param)
  }
})

test('buildScheduleUrl 用日期 key 直接拼出带秒的 matchTime，不随时区漂移', () => {
  // 早先用「本地零点 → getUTC*」格式化，在 Asia/Shanghai(UTC+8) 会变成前一天 16:00，
  // 导致当天所有比赛缺失。这里确保直接由日期 key 拼字符串。
  const url = buildScheduleUrl('2026-11-24')
  expect(url).toBe(
    'https://gwapi.pwesports.cn/eventcenter/app/csgo/event/getMatchList?matchTime=2026-11-24%2000%3A00%3A00',
  )
  expect(decodeURIComponent(url.split('matchTime=')[1])).toBe('2026-11-24 00:00:00')
  expect(decodeURIComponent(url)).toMatch(/matchTime=\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
})

test('normalizeSchedule 与 api.ts 的 normalizeMatchList 行为一致', () => {
  const list = [
    {
      id: 1,
      startTime: 1700000000000,
      team1DTO: { name: '9z' },
      team2DTO: { name: 'LVG' },
      score1: 11,
      score2: 13,
      bo: 'inf',
      status: 3,
      csgoEventDTO: { name: 'PGL Singapore Major 2026 Stage 1', level: 'major' },
    },
    {
      id: 2,
      startTime: 1700000001000,
      team1DTO: { name: 'TBD' },
      team2DTO: { name: 'TBD' },
      bo: 'bo1',
      status: 2,
      csgoEventDTO: { name: 'PGL Singapore Major 2026 Stage 1', level: 'major' },
    },
    {
      id: 3,
      startTime: 1700000002000,
      team1DTO: { name: 'A' },
      team2DTO: { name: 'B' },
      bo: 'bo3',
      status: 3,
      score1: 2,
      score2: 0,
      csgoEventDTO: { name: 'CROSSFIRE Season 7', level: 'minor' },
    },
  ]
  expect(normalizeSchedule({ result: { matchResponse: { dtoList: list as never } } })).toEqual(
    normalizeMatchList(list as never),
  )
})

test('matchFormat：boN 优先，否则按比分形态推断赛制', () => {
  // 未开始：接口直接给 boN
  expect(matchFormat('bo1', null, null)).toBe('bo1')
  expect(matchFormat('bo5', null, null)).toBe('bo5')

  // 进行中：bo 已变成地图代号（inf/nuke…），拿不到最终比分，保守回退 BO1
  expect(matchFormat('inf', null, null)).toBe('bo1')

  // 已结束：单局局分（胜方 ≥ 13）→ BO1
  expect(matchFormat('inf', 13, 5)).toBe('bo1')
  expect(matchFormat('nuke', 16, 14)).toBe('bo1')

  // 已结束：胜图数 → BO3 / BO5
  expect(matchFormat('inf', 2, 0)).toBe('bo3')
  expect(matchFormat('inf', 1, 2)).toBe('bo3')
  expect(matchFormat('mrg', 3, 1)).toBe('bo5')
})
