import Link from 'next/link'

import {
  eventSummaries,
  getEvent,
  getEventTimezone,
  getScheduleDays,
  hasSchedule,
  isToday,
  teamMap,
  winsNeeded,
} from '@/lib/data'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { TeamLogo } from '@/components/team/team-logo'

import type { Metadata } from 'next'
import type { MatchFormat, ScheduleDayView, ScheduleMatchView } from '@/types'

export const metadata: Metadata = {
  title: '赛程',
  description: '按天查看 CS2 Major 的比赛安排，包含阶段、战绩组与赛制。',
}

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

interface SchedulePageProps {
  params: Promise<{ 'event-id': string }>
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { 'event-id': eventId } = await params
  const event = getEvent(eventId)

  if (!hasSchedule(event)) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
        <PageHeader title="赛程" description={`${event.name} · 比赛安排`} />
        <EmptyState icon="📅" title="暂无赛程数据" description="赛程公布后会在这里按天展示" />
      </div>
    )
  }

  const timezone = getEventTimezone(event)
  const days = getScheduleDays(event)
  const total = days.reduce((sum, day) => sum + day.matches.length, 0)

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      <PageHeader
        title="赛程"
        description={`${event.name} · 共 ${total} 场比赛，按天分组。`}
        extra={
          <Link
            href={`/${eventId}/schedule/simulator`}
            className="bg-primary-500 hover:bg-primary-600 ml-auto shrink-0 rounded px-3 py-1 text-xs font-semibold text-white transition-colors active:scale-95"
          >
            赛事推演 ➜
          </Link>
        }
      />

      {/* 移动端日期快跳：横向滚动，长赛程不用一路划 */}
      <div className="-mx-3 mb-3 flex scrollbar-none gap-1.5 overflow-x-auto px-3 pb-1 sm:hidden">
        {days.map((day) => {
          const today = isToday(day.dateKey, timezone)

          return (
            <a
              key={day.dateKey}
              href={`#${day.dateKey}`}
              className={`flex shrink-0 items-baseline gap-1 rounded-md border px-2.5 py-1.5 transition-colors active:scale-95 ${
                today
                  ? 'border-primary-500/40 bg-primary-500/10 text-primary'
                  : 'border-border bg-surface-1 text-secondary'
              }`}
            >
              <span className="text-sm font-semibold tabular-nums">{shortDate(day.label)}</span>
              <span className="text-muted text-[11px]">{day.matches.length} 场</span>
            </a>
          )
        })}
      </div>

      <div className="space-y-4 sm:space-y-6">
        {days.map((day) => (
          <DaySection key={day.dateKey} day={day} today={isToday(day.dateKey, timezone)} />
        ))}
      </div>
    </div>
  )
}

/** 「11月24日周二」→「11/24」，给移动端快跳条用 */
function shortDate(label: string): string {
  const match = label.match(/(\d+)月(\d+)日/)
  return match ? `${match[1]}/${match[2]}` : label
}

/** 单天：日期标题 + 当天全部对局 */
function DaySection({ day, today }: { day: ScheduleDayView; today: boolean }) {
  return (
    <section id={day.dateKey} className="scroll-mt-14 sm:scroll-mt-32">
      {/* 移动端日期标题吸顶，长列表里滑到哪都知道是哪天 */}
      <div className="bg-surface-0/95 sticky top-12 z-10 mb-2 flex items-baseline gap-2 py-2 backdrop-blur-sm sm:static sm:mb-3 sm:bg-transparent sm:py-0">
        <h2
          className={`text-base font-semibold sm:text-lg ${
            today ? 'text-primary' : 'text-secondary'
          }`}
        >
          {day.label}
        </h2>
        <span className="text-muted border-border border-l pl-2 text-xs font-medium">
          {day.weekdayLabel}
        </span>
        <span className="text-muted text-xs tabular-nums">
          {day.timezoneLabel} · {day.matches.length} 场
        </span>
        {today && <span className="text-primary text-xs font-medium">今天</span>}
      </div>

      <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
        {day.matches.map((item) => (
          <MatchRow key={item.match.id} item={item} />
        ))}
      </div>
    </section>
  )
}

/**
 * 单场对局。
 *
 * 移动端：时间与比分在同一行组的两侧，标签行紧贴，队伍占满宽度（不再挤在 1/3 宽里）。
 * `sm` 起拆成单行：时间 | 标签 | 对阵 | 比分。
 */
function MatchRow({ item }: { item: ScheduleMatchView }) {
  const { match } = item
  const teamA = match.teamA
  const teamB = match.teamB
  const winner = match.winner ?? null

  const sideTone = (team: string | null) =>
    winner && team === winner ? 'text-win' : team ? 'text-primary' : 'text-muted'

  const isLive = item.status === 'live'

  return (
    <div
      className={`border-border flex flex-col gap-1.5 border-b p-2.5 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:p-3 ${
        isLive ? 'bg-primary-500/5 hover:bg-primary-500/10' : 'hover:bg-surface-2/40'
      }`}
    >
      {/*
        移动端两行：
        1) 时间（左） ⇠⇢ 阶段/战绩组/赛制（右）
        2) 主队（左对齐）| 比分（居中）| 客队（右对齐）——队名贴向两侧，比分层固定居中
        sm 起回到单行：时间 | 标签 | 对阵 | 比分
      */}
      <div className="flex items-center justify-between gap-2 sm:contents">
        <span className="text-secondary flex shrink-0 items-center gap-1.5 text-sm font-medium tabular-nums sm:order-1 sm:w-14 sm:text-xs">
          {item.timeLabel}
          {isLive && (
            <span className="relative flex size-2 sm:size-1.5" aria-label="进行中">
              <span className="bg-primary-400 absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary-500 relative inline-flex size-2 rounded-full sm:size-1.5" />
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:order-2 sm:w-64 sm:shrink-0 sm:justify-start">
          <Tag className="bg-surface-2 text-muted">{item.stageLabel}</Tag>
          <FormatTag format={match.format} />
          {isLive && <Tag className="bg-primary-500/15 text-primary-400">进行中</Tag>}
        </span>
      </div>

      {/* 对阵：主队靠左、比分居中、客队靠右；两侧等宽保证比分真正居中 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:order-3 sm:flex sm:flex-1 sm:items-center sm:gap-2">
        <TeamSide id={teamA} tone={sideTone(teamA)} align="start" />

        <span
          className={`px-1 text-center text-base tabular-nums sm:text-xs ${scoreTone(item, winner)}`}
        >
          {match.score ? `${match.score[0]} : ${match.score[1]}` : '—'}
        </span>

        <TeamSide id={teamB} tone={sideTone(teamB)} align="end" />
      </div>
    </div>
  )
}

/** 比分颜色：进行中高亮，已结束显示胜者色，未开始弱化 */
function scoreTone(item: ScheduleMatchView, winner: string | null): string {
  if (item.status === 'live') return 'text-primary-400 font-semibold'
  if (item.status === 'finished') return winner ? 'text-win font-semibold' : 'text-secondary'
  return 'text-muted'
}

/** 赛程行内的小标签，与阶段标签共用一套尺寸 */
function Tag({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>
  )
}

/** 赛制标签：与其它标签同样式，只用文字颜色区分权重 */
const FORMAT_STYLE: Record<MatchFormat, string> = {
  bo1: 'bg-surface-2 text-muted',
  bo3: 'bg-surface-2 text-secondary',
  bo5: 'bg-surface-2 text-primary-400',
}

function FormatTag({ format }: { format: MatchFormat }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
        FORMAT_STYLE[format] ?? 'bg-surface-2 text-secondary'
      }`}
      title={`${format.toUpperCase()} · 先赢 ${winsNeeded(format)} 局获胜`}
    >
      {format.toUpperCase()}
    </span>
  )
}

/** 战绩组配色：已晋级用胜色，已淘汰用败色，进行中用中性色 */
function groupTone(group: string): string {
  const [wins, losses] = group.split('-').map(Number)
  if (wins >= 3) return 'bg-win/10 text-win'
  if (losses >= 3) return 'bg-lose/10 text-lose'
  return 'bg-surface-2 text-secondary'
}

/**
 * 队伍展示。`align` 控制贴边方向：主队靠左、客队靠右，
 * 队标始终贴外侧，比分一侧是文字，两行对齐时视觉更整齐。
 */
function TeamSide({
  id,
  tone,
  align = 'start',
}: {
  id: string | null
  tone: string
  align?: 'start' | 'end'
}) {
  if (!id) {
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
      <TeamLogo hideLabel id={id} size="sm" className="rounded-sm" />
      <span className="truncate">{teamMap.get(id)?.shortName || teamMap.get(id)?.name || id}</span>
    </span>
  )
}
