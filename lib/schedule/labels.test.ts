import { expect, test } from 'vitest'
import { isPlayoffMatch, shortEventName } from '@/lib/schedule/labels'

const match = (eventName: string, eventNameZh: string, star: number | null = 1) => ({
  eventName,
  eventNameZh,
  star,
})

test('shortEventName：瑞士轮取「第N阶段」', () => {
  expect(
    shortEventName(match('PGL Singapore Major 2026 Stage 1', 'PGL新加坡Major第一阶段-2026')),
  ).toBe('第一阶段')
  expect(
    shortEventName(match('PGL Singapore Major 2026 Stage 2', 'PGL新加坡Major第二阶段-2026')),
  ).toBe('第二阶段')
  expect(
    shortEventName(match('PGL Singapore Major 2026 Stage 3', 'PGL新加坡Major第三阶段-2026')),
  ).toBe('第三阶段')
  expect(shortEventName(match('IEM Cologne Major 2026 Stage 3', 'IEM科隆Major第三阶段-2026'))).toBe(
    '第三阶段',
  )
})

test('shortEventName：决胜阶段的名字不带阶段，必须显示「决胜阶段」而不是 Major', () => {
  // 实测：淘汰赛 event（8302）名与主赛事同名，star=2
  expect(shortEventName(match('PGL Major Singapore 2026', 'PGL新加坡Major-2026', 2))).toBe(
    '决胜阶段',
  )
  expect(
    shortEventName(match('Intel Extreme Masters Cologne Major 2026', 'IEM科隆Major-2026', 2)),
  ).toBe('决胜阶段')
})

test('shortEventName：只有一边带阶段也能识别', () => {
  expect(shortEventName(match('PGL Singapore Major 2026 Stage 2', ''))).toBe('Stage 2')
  expect(shortEventName(match('', 'PGL新加坡Major第二阶段-2026'))).toBe('第二阶段')
})

test('isPlayoffMatch：能区分第三阶段与淘汰赛', () => {
  // 第三阶段：名字带 Stage 3，star=1
  expect(
    isPlayoffMatch(match('PGL Singapore Major 2026 Stage 3', 'PGL新加坡Major第三阶段-2026', 1)),
  ).toBe(false)
  // 淘汰赛：名字不带阶段，star=2
  expect(isPlayoffMatch(match('PGL Major Singapore 2026', 'PGL新加坡Major-2026', 2))).toBe(true)

  // star 缺失时退回看赛事名
  expect(
    isPlayoffMatch(match('PGL Singapore Major 2026 Stage 3', 'PGL新加坡Major第三阶段-2026', null)),
  ).toBe(false)
  expect(isPlayoffMatch(match('PGL Major Singapore 2026', 'PGL新加坡Major-2026', null))).toBe(true)

  // star=2 即使名字带阶段也算决胜阶段（以上游标记为准）
  expect(
    isPlayoffMatch(match('PGL Singapore Major 2026 Stage 3', 'PGL新加坡Major第三阶段-2026', 2)),
  ).toBe(true)
})
