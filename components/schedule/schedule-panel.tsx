'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ReactNode } from 'react'

import { buildScheduleUrl, normalizeSchedule, REFRESH_MS } from '@/lib/schedule/client'
import { lookupTeam, lookupTeamName } from '@/lib/schedule/teams'
import {
  formatDayLabel,
  formatTimeLabel,
  formatWeekdayLabel,
  formatYearLabel,
  matchesOfDay,
  shiftDateKey,
  todayKey,
} from '@/lib/schedule/date'

import type { RawApiResponse } from '@/lib/schedule/client'
import type { TeamLogoStatus } from '@/components/team/team-logo'
import type { MatchFormat, MatchStatus, ScheduleMatch, TeamInfo } from '@/types'

interface SchedulePanelProps {
  /** 接口队名 → 本地战队资料（服务端算好传入，客户端无法读 data/teams.json） */
  teamMap?: Record<string, TeamInfo>
  /** 服务端预取的赛程作为首屏数据，缺省时由浏览器自己请求 */
  initialMatches?: ScheduleMatch[]
  initialDateKey?: string
}

/**
 * 赛程面板：只展示某一天的对局，用左右按钮切换上下一天。
 *
 * 数据在浏览器里直接请求赛事方接口，只保留赛事名含 `Major` 的场次。
 */
export function SchedulePanel({ teamMap, initialMatches, initialDateKey }: SchedulePanelProps) {
  const [matches, setMatches] = useState<ScheduleMatch[]>(initialMatches ?? [])
  const [dateKey, setDateKey] = useState<string>(initialDateKey ?? todayKey())
  const [loading, setLoading] = useState(!initialMatches)
  const [error, setError] = useState<string | null>(null)

  /** 拉取某天的赛程：以该日 00:00 为起点请求，回来后按本地日期筛选 */
  const load = useCallback(async (targetKey: string, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(buildScheduleUrl(targetKey), { signal, cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = (await response.json()) as RawApiResponse
      if (data?.code !== 0) {
        throw new Error(data?.message || `接口返回异常（code ${data?.code ?? '未知'}）`)
      }

      setMatches(normalizeSchedule(data))
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [])

  // 首屏 / 切换日期：每次都请求所选日期的数据
  useEffect(() => {
    if (initialMatches && dateKey === initialDateKey) return
    const controller = new AbortController()
    void load(dateKey, controller.signal)
    return () => controller.abort()
  }, [dateKey, initialMatches, initialDateKey, load])

  // 定时刷新：只在当天有未结束的对局时刷新
  const hasPending = useMemo(
    () =>
      matchesOfDay(matches, dateKey).some((match) => match.status !== 'finished') ||
      matches.some((match) => match.status === 'live'),
    [matches, dateKey],
  )

  useEffect(() => {
    if (!hasPending) return
    const timer = setInterval(() => void load(dateKey), REFRESH_MS)
    return () => clearInterval(timer)
  }, [hasPending, load, dateKey])

  const dayMatches = useMemo(() => matchesOfDay(matches, dateKey), [matches, dateKey])

  // PC 两栏：前一半在左、后一半在右，两栏各自按开赛时间从上往下排
  const columns = useMemo<ScheduleMatch[][]>(() => {
    if (dayMatches.length === 0) return []
    const half = Math.ceil(dayMatches.length / 2)
    const left = dayMatches.slice(0, half)
    const right = dayMatches.slice(half)
    return right.length > 0 ? [left, right] : [left]
  }, [dayMatches])

  const previousDate = shiftDateKey(dateKey, -1)
  const nextDate = shiftDateKey(dateKey, 1)

  // 每天单独请求，因此前后日始终可切换
  const canGoPrevious = true
  const canGoNext = true

  const isToday = dateKey === todayKey()

  return (
    <div className="space-y-3">
      <DaySwitcher
        dateKey={dateKey}
        matchCount={dayMatches.length}
        isToday={isToday}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={() => setDateKey(previousDate)}
        onNext={() => setDateKey(nextDate)}
        onToday={() => setDateKey(todayKey())}
        onRefresh={() => void load(dateKey)}
        loading={loading}
      />

      {error && (
        <div className="border-lose/40 bg-lose/10 text-lose rounded-lg border px-4 py-3 text-xs">
          赛程加载失败：{error}
          <button
            type="button"
            onClick={() => void load(dateKey)}
            className="text-secondary ml-2 underline underline-offset-2"
          >
            重试
          </button>
        </div>
      )}

      {dayMatches.length === 0 ? (
        <DayCard>
          <p className="text-muted px-4 py-10 text-center text-sm">
            {loading && !error ? '赛程加载中…' : '当天没有 Major 比赛'}
          </p>
        </DayCard>
      ) : (
        // PC 两栏：左右各是一张完整卡片，栏内各行保持列表样式；只有一栏时仍占满宽度
        <div className="grid items-start sm:grid-cols-2 sm:gap-3">
          {columns.map((column, index) => (
            <DayCard key={index} className={columns.length > 1 ? undefined : 'sm:col-span-2'}>
              {column.map((match) => (
                <MatchRow key={match.id} match={match} teamMap={teamMap} />
              ))}
            </DayCard>
          ))}
        </div>
      )}
    </div>
  )
}

/** 一天的卡片容器：PC 两栏时左右各一张 */
function DayCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-1 border-border overflow-hidden rounded-lg border ${className}`}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 日期切换                                   */
/* -------------------------------------------------------------------------- */

interface DaySwitcherProps {
  dateKey: string
  matchCount: number
  isToday: boolean
  canGoPrevious: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onRefresh: () => void
  loading: boolean
}

/**
 * 日期操作按钮统一尺寸：移动端 36×36 方形只放图标，PC 固定高度 32 并显示文字，
 * 保证「今天 / 刷新 / 上下日」四个按钮高宽一致。
 */
const BUTTON_BASE =
  'border-border text-secondary hover:text-primary hover:bg-surface-2 inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-md border px-0 transition-colors active:scale-95 disabled:active:scale-100 sm:h-8 sm:w-auto sm:px-3 sm:text-sm'

/** 顶部日期条：← → | 日期 + 场次 | 今天 · 刷新（移动端全部压成一行，按钮只留图标） */
function DaySwitcher({
  dateKey,
  matchCount,
  isToday,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onToday,
  onRefresh,
  loading,
}: DaySwitcherProps) {
  return (
    <div className="bg-surface-1 border-border flex items-center gap-2 rounded-lg border px-2 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-primary text-sm font-semibold sm:text-lg">
            {formatDayLabel(dateKey)}
          </span>
          <span className="text-muted text-[11px] sm:text-sm">{formatWeekdayLabel(dateKey)}</span>
          {isToday && <span className="text-primary text-[11px] font-medium sm:text-sm">今天</span>}
        </div>
        <span className="text-muted truncate text-[10px] tabular-nums sm:text-xs">
          {formatYearLabel(dateKey)} · {matchCount} 场
          {loading && <span className="ml-1">· 更新中</span>}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToday}
          disabled={isToday}
          aria-label="回到今天"
          title="回到今天"
          className={`${BUTTON_BASE} disabled:opacity-40`}
        >
          <TodayIcon />
          <span className="hidden sm:inline">今天</span>
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className={BUTTON_BASE}
          aria-label="刷新赛程"
          title="刷新赛程"
        >
          <RefreshIcon
            className={loading ? 'animate-spin [animation-direction:reverse]' : undefined}
          />
          <span className="hidden sm:inline">刷新</span>
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          <DayButton
            direction="previous"
            disabled={!canGoPrevious}
            targetLabel={formatDayLabel(shiftDateKey(dateKey, -1))}
            onClick={onPrevious}
          />
          <DayButton
            direction="next"
            disabled={!canGoNext}
            targetLabel={formatDayLabel(shiftDateKey(dateKey, 1))}
            onClick={onNext}
          />
        </div>
      </div>
    </div>
  )
}

/** 上下日按钮：移动端只留箭头图标，PC 下补文字 */
function DayButton({
  direction,
  disabled,
  targetLabel,
  onClick,
}: {
  direction: 'previous' | 'next'
  disabled: boolean
  targetLabel: string
  onClick: () => void
}) {
  const isPrevious = direction === 'previous'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${isPrevious ? '上一日' : '下一日'}（${targetLabel}）`}
      title={`${isPrevious ? '上一日' : '下一日'}：${targetLabel}`}
      className={`${BUTTON_BASE} bg-surface-2 hover:border-border-active font-medium whitespace-nowrap disabled:opacity-30`}
    >
      {isPrevious && <ChevronIcon direction="previous" />}
      <span className="hidden sm:inline">{isPrevious ? '上一日' : '下一日'}</span>
      {!isPrevious && <ChevronIcon direction="next" />}
    </button>
  )
}

function ChevronIcon({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === 'previous' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

function TodayIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
      <path d="M12 14.5v4M10 16.5l2 2 2-2" />
    </svg>
  )
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 shrink-0 ${className}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.13 17.13c-.15.18-.31.36-.48.52c-.73.74-1.59 1.31-2.54 1.71c-1.97.83-4.26.83-6.23 0c-.95-.4-1.81-.98-2.54-1.72a7.8 7.8 0 0 1-1.71-2.54c-.42-.99-.63-2.03-.63-3.11H2c0 1.35.26 2.66.79 3.89c.5 1.19 1.23 2.26 2.14 3.18s1.99 1.64 3.18 2.14c1.23.52 2.54.79 3.89.79s2.66-.26 3.89-.79c1.19-.5 2.26-1.23 3.18-2.14c.17-.17.32-.35.48-.52L22 20.99v-6h-6l2.13 2.13Zm.94-12.2a9.9 9.9 0 0 0-3.18-2.14a10.12 10.12 0 0 0-7.79 0c-1.19.5-2.26 1.23-3.18 2.14c-.17.17-.32.35-.48.52L1.99 3v6h6L5.86 6.87c.15-.18.31-.36.48-.52c.73-.74 1.59-1.31 2.54-1.71c1.97-.83 4.26-.83 6.23 0c.95.4 1.81.98 2.54 1.72c.74.73 1.31 1.59 1.71 2.54c.42.99.63 2.03.63 3.11h2c0-1.35-.26-2.66-.79-3.89c-.5-1.19-1.23-2.26-2.14-3.18Z" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  单场对局                                  */
/* -------------------------------------------------------------------------- */

/** 赛制标签配色：BO5 最重，BO1 最轻 */
const FORMAT_STYLE: Record<MatchFormat, string> = {
  bo1: 'bg-surface-2 text-muted',
  bo3: 'bg-surface-2 text-secondary',
  bo5: 'bg-surface-2 text-primary-400',
}

function MatchRow({
  match,
  teamMap,
}: {
  match: ScheduleMatch
  teamMap?: Record<string, TeamInfo>
}) {
  const isLive = match.status === 'live'

  const sideTone = (team: string | null) => {
    if (!team) return 'text-muted'
    if (!match.winner) return 'text-primary'
    return team === match.winner ? 'text-win' : 'text-lose'
  }

  /** 队标胜负态：只有已分出胜负的对局才标色，其余保持常规样式 */
  const statusOf = (team: string | null): TeamLogoStatus => {
    if (!team || !match.winner) return 'normal'
    return team === match.winner ? 'win' : 'lose'
  }

  /** 比分颜色：进行中高亮，已结束显示胜者色，未开始弱化 */
  function scoreTone(match: ScheduleMatch): string {
    if (match.status === 'live') return 'text-primary-400 font-semibold'
    if (match.status === 'finished')
      return match.winner ? 'text-primary font-semibold' : 'text-secondary'
    return 'text-muted'
  }

  return (
    <div
      className={`border-border flex flex-col gap-1.5 border-b p-2.5 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-3 sm:px-3 sm:py-2.5 ${ROW_TONE[match.status]}`}
    >
      <div className="flex items-center justify-between gap-2 sm:contents">
        {/* 开赛时刻（进行中带脉冲点） */}
        <span className="text-secondary flex shrink-0 items-center gap-1.5 text-sm font-medium tabular-nums sm:order-1 sm:w-14 sm:flex-col sm:items-start sm:gap-1 sm:text-xs">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            {formatTimeLabel(match.start)}
            {isLive && (
              <span className="relative flex size-2 sm:size-1.5" aria-label="进行中">
                <span className="bg-primary-400 absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary-500 relative inline-flex size-2 rounded-full sm:size-1.5" />
              </span>
            )}
          </span>
          <span
            className={`bg-surface-2 text-muted hidden items-center rounded px-1 py-0.5 text-[10px] font-medium sm:inline-flex`}
          >
            {match.format.toUpperCase()}
          </span>
        </span>

        {/* 赛事/阶段名：按内容收紧，状态由整行样式表达 */}
        <span className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 sm:order-2 sm:shrink-0 sm:justify-start">
          <span
            className="bg-surface-2 text-muted max-w-24 truncate rounded px-1.5 py-0.5 text-[11px] font-medium sm:max-w-20"
            title={match.eventNameZh || match.eventName}
          >
            {shortEventName(match)}
          </span>
          <span
            className={`bg-surface-2 text-muted inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium sm:hidden`}
          >
            {match.format.toUpperCase()}
          </span>
        </span>
      </div>

      {/* 队伍区固定宽度：左右两栏等宽、向中间靠，比分列居中且各卡竖直对齐 */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:order-3 sm:ml-auto sm:w-72 sm:shrink-0 sm:gap-3">
        <TeamSide
          name={match.teamA}
          teamMap={teamMap}
          tone={sideTone(match.teamA)}
          status={statusOf(match.teamA)}
          align="start"
        />

        <span
          className={`w-12 shrink-0 text-center text-base font-bold break-keep whitespace-nowrap tabular-nums sm:w-11 sm:text-sm ${scoreTone(match)}`}
        >
          {match.score ? `${match.score[0]} : ${match.score[1]}` : '—'}
        </span>

        <TeamSide
          name={match.teamB}
          teamMap={teamMap}
          tone={sideTone(match.teamB)}
          status={statusOf(match.teamB)}
          align="end"
        />
      </div>
    </div>
  )
}

/**
 * 对局行样式：用整行的底色与左侧色条表达状态，不再占位显示状态标签。
 * - 进行中：主色底 + 左侧竖条 + 呼吸动画
 * - 已结束：无底色，弱化（hover 才提亮）
 * - 未开始：淡底色，提示「可以进行」
 */
const ROW_TONE: Record<MatchStatus, string> = {
  live: 'relative bg-primary-500/10 hover:bg-primary-500/15 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary-500 before:animate-pulse',
  finished: 'opacity-80 hover:opacity-100 hover:bg-surface-2/40',
  upcoming: 'bg-surface-2/20 hover:bg-surface-2/40',
}

/** 队标外框配色：与竞猜页 `TeamLogo` 的图标样式一致（透明描边 / 胜者绿 / 败者红） */
const TEAM_ICON_TONE: Record<TeamLogoStatus, string> = {
  normal: 'border border-transparent bg-surface-3',
  win: 'border border-win/80 bg-win/30',
  lose: 'border border-lose/80 bg-lose/30',
}

/**
 * 展示用阶段名：只显示「第几阶段」，如「PGL新加坡Major第一阶段-2026」→「第一阶段」。
 *
 * 先看中文名的「第N阶段」，再看英文名的 `Stage N`；都没有时退回「Major」。
 */
function shortEventName(match: ScheduleMatch): string {
  for (const name of [match.eventNameZh, match.eventName]) {
    const stage = name?.match(/第\s*([0-9一二三四五六七八九十]+)\s*阶段|\bStage\s*([0-9]+)\b/i)
    if (!stage) continue
    return stage[1] ? `第${stage[1]}阶段` : `Stage ${stage[2]}`
  }
  return 'Major'
}

/**
 * 队名 → 本地战队资料（队标 + 短名）。
 *
 * 用服务端传入的映射表（来自 `data/teams.json`），接口自带 logo 不参与，
 * 保证队名与队标始终是本地资源里的同一份写法。
 */
function teamOf(name: string | null, teamMap?: Record<string, TeamInfo>): TeamInfo | null {
  if (!name || !teamMap) return null
  return lookupTeam(name, teamMap)
}

/**
 * 队伍展示：队名统一映射成本地短名（＝队标资源 id），队标同样用本地资源。
 * 本地没有的队伍退回接口原名 + 占位块。
 * `align` 控制贴边方向：主队靠左、客队靠右。
 */
function TeamSide({
  name,
  teamMap,
  tone,
  status = 'normal',
  align = 'start',
}: {
  name: string | null
  teamMap?: Record<string, TeamInfo>
  tone: string
  status?: TeamLogoStatus
  align?: 'start' | 'end'
}) {
  if (!name) {
    return (
      <span className={`text-muted text-sm italic ${align === 'end' ? 'text-right' : ''}`}>
        待定
      </span>
    )
  }

  const team = teamOf(name, teamMap)
  const label = lookupTeamName(name, teamMap ?? {}) ?? name
  const logo = team?.logo || null

  return (
    <span
      className={`flex min-w-0 items-center gap-2 text-[15px] font-medium whitespace-nowrap sm:text-sm ${tone} ${
        align === 'end' ? 'flex-row-reverse justify-start sm:justify-start' : ''
      }`}
      title={name}
    >
      <span
        className={`flex size-[30px] shrink-0 items-center justify-center rounded p-[2px] ${TEAM_ICON_TONE[status]}`}
      >
        {logo ? (
          <Image
            src={logo}
            alt=""
            width={26}
            height={26}
            className="size-full rounded-sm object-contain"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <span className="bg-surface-3 size-full rounded-sm" aria-hidden />
        )}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}
