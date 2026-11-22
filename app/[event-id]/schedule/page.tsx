import Link from 'next/link'

import { eventSummaries, getEvent, getScheduleDays, hasSchedule, teamMap } from '@/lib/data'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { TeamLogo } from '@/components/team/team-logo'

import type { Metadata } from 'next'
import type { ScheduleDayView, ScheduleMatchView } from '@/types'

export const metadata: Metadata = {
  title: '赛程',
  description: '按天查看 CS2 Major 的比赛安排，包含阶段、战绩组与赛制信息。',
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
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
        <PageHeader title="赛程" description={`${event.name} · 比赛安排`} />
        <EmptyState icon="📅" title="暂无赛程数据" description="赛程公布后会在这里按天展示" />
      </div>
    )
  }

  const days = getScheduleDays(event)
  const total = days.reduce((sum, day) => sum + day.matches.length, 0)

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
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

      <div className="space-y-6">
        {days.map((day) => (
          <DaySection key={day.dateKey} day={day} />
        ))}
      </div>
    </div>
  )
}

/** 单天：日期标题 + 当天全部对局 */
function DaySection({ day }: { day: ScheduleDayView }) {
  return (
    <section id={day.dateKey} className="scroll-mt-32">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-primary text-lg font-semibold">{day.label}</h2>
        <span className="text-muted text-xs tabular-nums">{day.timezoneLabel}</span>
        <span className="text-muted text-xs">· {day.matches.length} 场</span>
      </div>

      <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
        {day.matches.map((item) => (
          <MatchRow key={item.match.id} item={item} />
        ))}
      </div>
    </section>
  )
}

/** 单场对局：时间 · 阶段/轮次/战绩组/赛制 · 对阵 */
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
      className={`border-border flex flex-col gap-2 border-b p-3 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-4 ${
        isLive ? 'bg-primary-500/5 hover:bg-primary-500/10' : 'hover:bg-surface-2/40'
      }`}
    >
      {/* 时间：每局都显示；进行中显示脉冲圆点 */}
      <div className="text-secondary flex shrink-0 items-center gap-1.5 text-xs font-medium tabular-nums sm:w-14">
        {item.timeLabel}
        {isLive && (
          <span className="relative flex size-1.5" aria-label="进行中">
            <span className="bg-primary-400 absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-primary-500 relative inline-flex size-1.5 rounded-full" />
          </span>
        )}
      </div>

      {/* 阶段（含轮次）/ 战绩组 / 赛制 均为标签 */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:w-64">
        <Tag className="bg-primary-500/10 text-primary-400">{item.stageLabel}</Tag>
        {item.groupLabel && item.groupLabel !== '0-0' && (
          <Tag className={groupTone(item.groupLabel)}>{item.groupLabel} 组</Tag>
        )}
        <Tag className="bg-surface-3 text-secondary">{item.formatLabel}</Tag>
        {isLive && <Tag className="bg-primary-500/15 text-primary-400">进行中</Tag>}
      </div>

      {/* 对阵 */}
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <TeamSide id={teamA} tone={sideTone(teamA)} />
          <span className="text-muted shrink-0 text-xs">vs</span>
          <TeamSide id={teamB} tone={sideTone(teamB)} />
        </div>

        <span className={`shrink-0 text-xs tabular-nums ${scoreTone(item, winner)}`}>
          {match.score ? `${match.score[0]} : ${match.score[1]}` : '—'}
        </span>
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

/** 战绩组配色：已晋级用胜色，已淘汰用败色，进行中用中性色 */
function groupTone(group: string): string {
  const [wins, losses] = group.split('-').map(Number)
  if (wins >= 3) return 'bg-win/10 text-win'
  if (losses >= 3) return 'bg-lose/10 text-lose'
  return 'bg-surface-2 text-secondary'
}

function TeamSide({ id, tone }: { id: string | null; tone: string }) {
  if (!id) return <span className="text-muted text-sm italic">TBD</span>

  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-sm font-medium ${tone}`}>
      <TeamLogo hideLabel id={id} size="sm" className="rounded-sm" />
      <span className="truncate">{teamMap.get(id)?.shortName || teamMap.get(id)?.name || id}</span>
    </span>
  )
}
