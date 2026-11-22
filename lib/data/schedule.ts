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

import { getMatchFormat, getMatchStatus, parseRecord } from './swiss'

import type { MajorEvent, MajorStageType, Match, ScheduleDayView, ScheduleMatchView } from '@/types'

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

/** 时区短标签，如「GMT+8」 */
function toTimezoneLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? timezone
  } catch {
    return timezone
  }
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

/** 阶段名，如「第一阶段」（轮次信息由战绩组标签承担） */
function buildStageLabel(stageId: MajorStageType): string {
  return MAJOR_STAGE_LABEL[stageId]
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
      const rawStatus = getMatchStatus(format, match.score ?? null)

      // 队伍待定的占位场次不可能「进行中」：真实情况是对阵未产生，按未开始展示
      const teamsPending = !match.teamA || !match.teamB

      views.push({
        match,
        stageId,
        stageLabel: buildStageLabel(stageId),
        groupLabel: match.group ?? '',
        formatLabel: format.toUpperCase(),
        status: teamsPending && rawStatus === 'live' ? 'upcoming' : rawStatus,
        teamsPending,
        dateKey: toDateKey(start, timezone),
        timeLabel: formatMatchTime(match, timezone),
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
      timezoneLabel: toTimezoneLabel(timezone),
      matches: [view],
      resolved: !view.teamsPending,
      stageId: view.stageId,
    })
  }

  // 先汇总每天的「是否已确定对阵」，再回写到每一场，避免页面自行判断
  for (const day of days.values()) {
    day.resolved = day.matches.every((item) => !item.teamsPending)
  }

  return [...days.values()]
}

/* -------------------------------------------------------------------------- */
/*                                  日期辅助                                  */
/* -------------------------------------------------------------------------- */

/** 一天的长度（毫秒），用于「今天」判断 */
const DAY_MS = 24 * 60 * 60 * 1000

/** 时区下的「今天」偏移天数：0 = 今天，1 = 明天，-1 = 昨天 */
function dayOffset(dateKey: string, now: Date, timezone: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const [ny, nm, nd] = toDateKey(now, timezone).split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ny, nm - 1, nd)) / DAY_MS)
}

/** 某天是否就是今天（按赛事时区） */
export function isToday(dateKey: string, timezone: string, now: Date = new Date()): boolean {
  return dayOffset(dateKey, now, timezone) === 0
}

/** 某阶段的对局所属轮次（用于推演页展示「第几轮」） */
export function getStageRounds(event: MajorEvent, stageId: MajorStageType): number[] {
  const rounds = new Set<number>()
  for (const match of stageMatches(event, stageId)) {
    if (match.round) rounds.add(match.round)
  }
  return [...rounds].toSorted((a, b) => a - b)
}
