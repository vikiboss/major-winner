import Link from 'next/link'

import {
  eventSummaries,
  formatMatchDateTime,
  getEvent,
  getEventTimezone,
  getScheduleDays,
  hasSchedule,
  teamMap,
} from '@/lib/data'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TeamLogo } from '@/components/team/team-logo'

import type { Metadata } from 'next'
import type { ScheduleMatchView } from '@/types'

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
  const timezone = getEventTimezone(event)
  const total = days.reduce((sum, day) => sum + day.matches.length, 0)

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        title="赛程"
        description={`${event.name} · 共 ${total} 场比赛，按天分组。`}
      >
        <Link
          href={`/${eventId}/schedule/simulator`}
          className="text-primary-400 ml-2 hover:underline"
        >
          赛事推演 ➜
        </Link>
      </PageHeader>

      <div className="space-y-6">
        {days.map((day) => (
          <DaySection key={day.dateKey} dateKey={day.dateKey} label={day.label} timezone={timezone}>
            {day.matches}
          </DaySection>
        ))}
      </div>
    </div>
  )
}

interface DaySectionProps {
  dateKey: string
  label: string
  timezone: string
  children: ScheduleMatchView[]
}

/** 单天：日期标题 + 当天全部对局 */
function DaySection({ dateKey, label, timezone, children }: DaySectionProps) {
  return (
    <section id={dateKey} className="scroll-mt-32">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-primary text-lg font-semibold">{label}</h2>
        <span className="text-muted text-xs">{children.length} 场</span>
      </div>

      <div className="space-y-2">
        {children.map((item) => (
          <MatchRow key={item.match.id} item={item} timezone={timezone} />
        ))}
      </div>
    </section>
  )
}

/** 单场对局：时间 · 阶段/轮次/战绩组/赛制 · 对阵 */
function MatchRow({ item, timezone }: { item: ScheduleMatchView; timezone: string }) {
  const { match } = item
  const teamA = match.teamA
  const teamB = match.teamB
  const winner = match.winner ?? null

  const sideTone = (team: string | null) =>
    winner && team === winner ? 'text-win' : team ? 'text-primary' : 'text-muted'

  return (
    <div className="bg-surface-1 border-border hover:bg-surface-2/40 flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:gap-4">
      {/* 时间 */}
      <div className="text-muted shrink-0 text-xs tabular-nums sm:w-16">
        {formatMatchDateTime(match, timezone)}
      </div>

      {/* 阶段信息 */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:w-52">
        <span className="bg-primary-500/10 text-primary-400 rounded px-1.5 py-0.5 text-[11px] font-medium">
          {item.stageLabel}
        </span>
        <span className="text-muted text-[11px]">{item.detail}</span>
      </div>

      {/* 对阵 */}
      <div className="flex flex-1 items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <TeamSide id={teamA} tone={sideTone(teamA)} />
          <span className="text-muted shrink-0 text-xs">vs</span>
          <TeamSide id={teamB} tone={sideTone(teamB)} />
        </div>

        <span className="text-muted shrink-0 text-xs tabular-nums">
          {item.hasScore ? `${match.score![0]} : ${match.score![1]}` : '—'}
        </span>
      </div>
    </div>
  )
}

function TeamSide({ id, tone }: { id: string | null; tone: string }) {
  if (!id) return <span className="text-muted text-sm italic">TBD</span>

  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-sm font-medium ${tone}`}>
      <TeamLogo hideLabel id={id} size="sm" className="rounded-sm" />
      <span className="truncate">{teamMap.get(id)?.name || teamMap.get(id)?.shortName || id}</span>
    </span>
  )
}
