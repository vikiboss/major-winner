/**
 * 赛程数据：把 `data/events.json` 里各阶段的 `schedule.matches` 展开成页面视图模型。
 *
 * - 按开始时间升序排列
 * - 按赛事时区（`event.timezone`，默认 Asia/Shanghai）分天
 * - 补上阶段名、战绩组说明、赛制等展示信息
 *
 * 页面只从这里取数据，不在组件里自行计算日期分组。
 */

import { MAJOR_STAGES, MAJOR_STAGE_LABEL } from '@/lib/constants'

import { getMatchFormat, parseRecord } from './swiss'

import type {
  MajorEvent,
  MajorStageType,
  Match,
  MatchFormat,
  ScheduleDayView,
  ScheduleMatchView,
} from '@/types'

const DEFAULT_TIMEZONE = 'Asia/Shanghai'

/** 赛事时区 */
export function getEventTimezone(event: MajorEvent): string {
  return event.timezone ?? DEFAULT_TIMEZONE
}

/** 某阶段是否有可展示的赛程 */
export function hasStageSchedule(event: MajorEvent, stageId: MajorStageType): boolean {
  return (event[stageId]?.schedule?.matches?.length ?? 0) > 0
}

/** 整个赛事是否有赛程数据 */
export function hasSchedule(event: MajorEvent): boolean {
  return MAJOR_STAGES.some((stageId) => hasStageSchedule(event, stageId))
}

function stageMatches(event: MajorEvent, stageId: MajorStageType): Match[] {
  return event[stageId]?.schedule?.matches ?? []
}

/**
 * 时区下的日期 key（YYYY-MM-DD）。
 * 用 `en-CA` 的日期格式天然就是 YYYY-MM-DD。
 */
function toDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** 日期标题，如「11月15日 周六」 */
function toDateLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

/** 对局时间，如 18:00 */
export function formatMatchTime(match: Match, timezone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(match.start))
}

/** 对局时间完整格式，如 11月15日 18:00（带时区标签） */
export function formatMatchDateTime(match: Match, timezone: string): string {
  return `${toDateLabel(new Date(match.start), timezone)} ${formatMatchTime(match, timezone)}`
}

/** 日内分组的小标题，如「第 2 轮 · 1-0 组 · BO1」 */
function buildDetail(match: Match, format: MatchFormat): string {
  const parts: string[] = []

  if (match.round) parts.push(`第 ${match.round} 轮`)
  if (match.group) parts.push(`${match.group} 组`)
  parts.push(format.toUpperCase())

  return parts.join(' · ')
}

/**
 * 生成赛程视图（按天分组，天内按时间升序）。
 *
 * @param stage 只保留某个阶段；不传则包含所有阶段
 */
export function getScheduleDays(event: MajorEvent, stage?: MajorStageType): ScheduleDayView[] {
  const timezone = getEventTimezone(event)
  const stageIds = stage ? [stage] : MAJOR_STAGES

  const views: ScheduleMatchView[] = []

  for (const stageId of stageIds) {
    for (const match of stageMatches(event, stageId)) {
      const start = new Date(match.start)
      if (Number.isNaN(start.getTime())) continue

      const format = match.format ?? getMatchFormat(parseRecord(match.group ?? '0-0'))
      const [a, b] = match.score ?? [null, null]

      views.push({
        match,
        stageId,
        stageLabel: MAJOR_STAGE_LABEL[stageId],
        detail: buildDetail(match, format),
        dateKey: toDateKey(start, timezone),
        hasScore: a !== null && b !== null,
      })
    }
  }

  views.sort((x, y) => new Date(x.match.start).getTime() - new Date(y.match.start).getTime())

  const days = new Map<string, ScheduleDayView>()

  for (const view of views) {
    const existing = days.get(view.dateKey)
    if (existing) {
      existing.matches.push(view)
      continue
    }

    days.set(view.dateKey, {
      dateKey: view.dateKey,
      label: toDateLabel(new Date(view.match.start), timezone),
      matches: [view],
    })
  }

  return [...days.values()]
}

/** 某阶段的对局所属轮次（用于推演页展示「第几轮」） */
export function getStageRounds(event: MajorEvent, stageId: MajorStageType): number[] {
  const rounds = new Set<number>()
  for (const match of stageMatches(event, stageId)) {
    if (match.round) rounds.add(match.round)
  }
  return [...rounds].toSorted((a, b) => a - b)
}
