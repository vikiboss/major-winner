/**
 * 赛程页的日期辅助。
 *
 * 赛程页按「天」展示，全部在浏览器本地时区计算：
 * - `dateKeyOf` 把时间戳落成 `YYYY-MM-DD`
 * - `shiftDateKey` / `dateKeyToDate` 用于左右切换上下日
 * - `formatDayLabel` 等只负责展示文案
 */

import type { ScheduleMatch } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** 一天内的毫秒数 */
export const ONE_DAY_MS = DAY_MS

/** 时间戳 → 本地日期 key（YYYY-MM-DD） */
export function dateKeyOf(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 日期 key → 当天 00:00 的本地时间戳（非法 key 返回 NaN） */
export function dateKeyToTimestamp(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return Number.NaN
  return new Date(year, month - 1, day).getTime()
}

/** 日期 key 平移若干天（可为负数） */
export function shiftDateKey(dateKey: string, days: number): string {
  const timestamp = dateKeyToTimestamp(dateKey)
  if (Number.isNaN(timestamp)) return dateKey
  return dateKeyOf(timestamp + days * DAY_MS)
}

/** 今天的日期 key（可传入「现在」方便测试） */
export function todayKey(now: Date = new Date()): string {
  return dateKeyOf(now.getTime())
}

/** 筛选某一天的对局（按开赛时间升序） */
export function matchesOfDay(matches: ScheduleMatch[], dateKey: string): ScheduleMatch[] {
  return matches
    .filter((match) => dateKeyOf(match.start) === dateKey)
    .toSorted((x, y) => x.start - y.start || x.id - y.id)
}

/** 有对局的日期（升序），用于判断是否存在「上一日 / 下一日」 */
export function matchDateKeys(matches: ScheduleMatch[]): string[] {
  return [...new Set(matches.map((match) => dateKeyOf(match.start)))].toSorted()
}

/* -------------------------------------------------------------------------- */
/*                                  展示文案                                  */
/* -------------------------------------------------------------------------- */

/** 日期标题，如「11月24日」 */
export function formatDayLabel(dateKey: string): string {
  const timestamp = dateKeyToTimestamp(dateKey)
  if (Number.isNaN(timestamp)) return dateKey
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(timestamp)
}

/** 星期，如「周二」 */
export function formatWeekdayLabel(dateKey: string): string {
  const timestamp = dateKeyToTimestamp(dateKey)
  if (Number.isNaN(timestamp)) return ''
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(timestamp)
}

/** 年份，如「2026」 */
export function formatYearLabel(dateKey: string): string {
  const timestamp = dateKeyToTimestamp(dateKey)
  if (Number.isNaN(timestamp)) return ''
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric' }).format(timestamp)
}

/** 开赛时刻，如「12:05」 */
export function formatTimeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp)
}
