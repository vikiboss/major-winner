'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { buildScheduleUrl, normalizeSchedule, REFRESH_MS } from '@/lib/schedule/client'
import { lookupTeamLogo } from '@/lib/schedule/teams'
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
import type { MatchFormat, ScheduleMatch } from '@/types'

interface SchedulePanelProps {
  /** 接口队名 → 本地队标地址（服务端算好传入，客户端无法读 data/teams.json） */
  teamLogos?: Record<string, string>
  /** 服务端预取的赛程作为首屏数据，缺省时由浏览器自己请求 */
  initialMatches?: ScheduleMatch[]
  initialDateKey?: string
}

/**
 * 赛程面板：只展示某一天的对局，用左右按钮切换上下一天。
 *
 * 数据在浏览器里直接请求赛事方接口，只保留赛事名含 `Major` 的场次。
 */
export function SchedulePanel({ teamLogos, initialMatches, initialDateKey }: SchedulePanelProps) {
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

      <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
        {dayMatches.length === 0 ? (
          <p className="text-muted px-4 py-10 text-center text-sm">
            {loading && !error ? '赛程加载中…' : '当天没有 Major 比赛'}
          </p>
        ) : (
          dayMatches.map((match) => <MatchRow key={match.id} match={match} teamLogos={teamLogos} />)
        )}
      </div>
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

/** 顶部日期条：← 上一日 | 日期 + 场次 | 下一日 → */
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
    <div className="bg-surface-1 border-border flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-center sm:gap-3 sm:px-3 sm:py-2.5">
      <div className="order-2 flex items-center justify-center gap-2 sm:order-none sm:shrink-0">
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

      <div className="order-1 flex min-w-0 flex-1 flex-col items-center sm:order-none">
        <div className="flex items-baseline gap-1.5">
          <span className="text-primary text-base font-semibold sm:text-lg">
            {formatDayLabel(dateKey)}
          </span>
          <span className="text-muted text-xs sm:text-sm">{formatWeekdayLabel(dateKey)}</span>
          {isToday && <span className="text-primary text-xs font-medium sm:text-sm">今天</span>}
        </div>
        <span className="text-muted text-[11px] tabular-nums sm:text-xs">
          {formatYearLabel(dateKey)} · {matchCount} 场
          {loading && <span className="ml-1">· 更新中</span>}
        </span>
      </div>

      <div className="order-3 flex shrink-0 items-center justify-center gap-2 sm:order-none">
        <button
          type="button"
          onClick={onToday}
          disabled={isToday}
          className="border-border text-secondary hover:text-primary hover:bg-surface-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 disabled:opacity-40 disabled:active:scale-100 sm:text-sm"
        >
          回到今天
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="border-border text-secondary hover:text-primary hover:bg-surface-2 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 sm:text-sm"
          aria-label="刷新赛程"
          title="刷新赛程"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>
    </div>
  )
}

/** 上下日按钮：图标 + 文字，PC 下同时显示目标日期 */
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
      className="border-border bg-surface-2 text-secondary hover:text-primary hover:border-border-active inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors active:scale-95 disabled:opacity-30 disabled:active:scale-100 sm:px-3 sm:py-2 sm:text-sm"
    >
      {isPrevious && <ChevronIcon direction="previous" />}
      <span className="hidden sm:inline">{isPrevious ? '上一日' : '下一日'}</span>
      <span className="sm:hidden">{isPrevious ? '前一天' : '后一天'}</span>
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

function RefreshIcon({ className = '' }: { className?: string }) {
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
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
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
  teamLogos,
}: {
  match: ScheduleMatch
  teamLogos?: Record<string, string>
}) {
  const isLive = match.status === 'live'

  const sideTone = (team: string | null) => {
    if (!team) return 'text-muted'
    if (!match.winner) return 'text-primary'
    return team === match.winner ? 'text-win' : 'text-lose'
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
      className={`border-border flex flex-col gap-1.5 border-b p-2.5 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:p-3 ${
        isLive ? 'bg-primary-500/5 hover:bg-primary-500/10' : 'hover:bg-surface-2/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 sm:contents">
        <span className="text-secondary flex shrink-0 items-center gap-1.5 text-sm font-medium tabular-nums sm:order-1 sm:w-14 sm:text-xs">
          {formatTimeLabel(match.start)}
          {isLive && (
            <span className="relative flex size-2 sm:size-1.5" aria-label="进行中">
              <span className="bg-primary-400 absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary-500 relative inline-flex size-2 rounded-full sm:size-1.5" />
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:order-2 sm:w-64 sm:shrink-0 sm:justify-start">
          <span
            className="bg-surface-2 text-muted truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
            title={match.eventNameZh}
          >
            {shortEventName(match)}
          </span>
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${FORMAT_STYLE[match.format] ?? 'bg-surface-2 text-secondary'}`}
          >
            {match.format.toUpperCase()}
          </span>
          {isLive && (
            <span className="bg-primary-500/15 text-primary-400 rounded px-1.5 py-0.5 text-[11px] font-medium">
              进行中
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:order-3 sm:flex sm:flex-1 sm:items-center sm:gap-2">
        <TeamSide
          name={match.teamA}
          logo={logoOf(match.teamA, teamLogos)}
          tone={sideTone(match.teamA)}
          align="start"
        />

        <span
          className={`px-1 text-center text-base font-bold tabular-nums sm:text-xs ${scoreTone(match)}`}
        >
          {match.score ? `${match.score[0]} : ${match.score[1]}` : '—'}
        </span>

        <TeamSide
          name={match.teamB}
          logo={logoOf(match.teamB, teamLogos)}
          tone={sideTone(match.teamB)}
          align="end"
        />
      </div>
    </div>
  )
}

/** 赛事名太长，去掉年份并压缩 Common 后缀，如「PGL Singapore Major 2026 Stage 1」→「PGL Singapore Major · Stage 1」 */
function shortEventName(match: ScheduleMatch): string {
  const name = match.eventName
    .replace(/\s*\b20\d{2}\b\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name || match.eventNameZh || 'Major'
}

/**
 * 队名 → 本地队标。
 *
 * 优先用服务端传入的映射表（本地 `data/teams.json` 的资源），
 * 查不到时再退回接口自带的 logo，最后才是占位块。
 */
function logoOf(name: string | null, teamLogos?: Record<string, string>): string | null {
  if (!name || !teamLogos) return null
  return lookupTeamLogo(name, teamLogos)
}

/**
 * 队伍展示：接口给的是队名，队标用本地资源（缺省时只显示队名）。
 * `align` 控制贴边方向：主队靠左、客队靠右。
 */
function TeamSide({
  name,
  logo,
  tone,
  align = 'start',
}: {
  name: string | null
  logo: string | null
  tone: string
  align?: 'start' | 'end'
}) {
  if (!name) {
    return (
      <span className={`text-muted text-sm italic ${align === 'end' ? 'text-right' : ''}`}>
        待定
      </span>
    )
  }

  return (
    <span
      className={`flex min-w-0 items-center gap-1.5 text-[15px] font-medium sm:text-sm ${tone} ${
        align === 'end' ? 'flex-row-reverse justify-start' : ''
      }`}
    >
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={20}
          height={20}
          className="bg-surface-3 size-5 shrink-0 rounded-sm object-contain"
          referrerPolicy="no-referrer"
          unoptimized
        />
      ) : (
        <span className="bg-surface-3 size-5 shrink-0 rounded-sm" aria-hidden />
      )}
      <span className="truncate">{name}</span>
    </span>
  )
}
