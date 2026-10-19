import { eventSummaries, getEvent, teamMap } from '@/lib/data'
import { STAGE_META } from '@/lib/constants'
import { getRankedTeams, type TeamTone } from '@/lib/team'
import { rankTone } from '@/lib/format'
import { PageHeader } from '@/components/ui/page-header'
import { TeamLogo } from '@/components/team/team-logo'
import { TeamPerformanceTags } from '@/components/team/team-performance-tags'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '参赛队伍',
  description: '查看所有 CS2 Major 参赛队伍的表现和晋级状态。',
}

export async function generateStaticParams() {
  return eventSummaries.map((event) => ({ 'event-id': event.id }))
}

const STATUS_CLASS: Record<TeamTone, string> = {
  champion: 'text-primary-400 font-semibold',
  'runner-up': 'text-primary-300 font-semibold',
  advanced: 'text-win',
  'in-progress': 'text-primary-400',
  waiting: 'text-muted',
  eliminated: 'text-lose',
  idle: 'text-muted',
}

export default async function TeamsPage({ params }: { params: Promise<{ 'event-id': string }> }) {
  const { 'event-id': eventId } = await params

  const event = getEvent(eventId)
  const teams = getRankedTeams(event)
  const championId = event.playoffs.result['2-to-1'].winner
  const championName = championId ? (teamMap.get(championId)?.name ?? championId) : null

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        title="参赛战队"
        description={`${event.name} · 共 ${teams.length} 支队伍。Ctrl + F 快速搜索。`}
      />

      {championName && (
        <div className="from-primary-500/20 to-primary-400/10 border-primary-500/30 mb-6 rounded-lg border bg-linear-to-r px-6 py-3 text-center">
          <div className="text-primary-400 text-sm font-medium">🏆 Major 冠军 {championName}</div>
        </div>
      )}

      {/* 移动端卡片 */}
      <div className="space-y-3 md:hidden">
        {teams.map((team) => (
          <div key={team.id} className="bg-surface-1 border-border rounded-lg border p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <TeamLogo hideLabel id={team.id} size="xl" className="rounded-sm" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-primary text-sm font-medium text-nowrap">
                    {teamMap.get(team.id)?.name || team.id}
                  </h3>
                  <p className="text-muted text-sm">{STAGE_META[team.stage].groupName}</p>
                </div>
              </div>
              <span className={`text-xs text-nowrap ${STATUS_CLASS[team.status.tone]}`}>
                {team.status.text}
              </span>
            </div>
            <TeamPerformanceTags performance={team.performance} />
          </div>
        ))}
      </div>

      {/* 桌面表格 */}
      <div className="bg-surface-1 border-border hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full min-w-125">
          <thead className="bg-surface-2 border-border border-b">
            <tr className="text-muted border-border border-b text-left text-xs font-medium tracking-wide uppercase">
              <th className="w-12 px-4 py-3">#</th>
              <th className="px-4 py-3">战队</th>
              <th className="px-4 py-3">起始组别</th>
              <th className="px-4 py-3">当前状态</th>
              <th className="px-4 py-3 text-center">比赛战绩</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {teams.map((team, index) => (
              <tr key={team.id} className="bg-surface-1 hover:bg-surface-2/50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${rankTone(index)}`}>{index + 1}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <TeamLogo hideLabel id={team.id} size="lg" className="rounded-sm" />
                    <span className="text-primary text-sm font-medium text-nowrap">
                      {teamMap.get(team.id)?.name || team.id}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-muted text-sm text-nowrap">
                    {STAGE_META[team.stage].groupName}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-sm text-nowrap ${STATUS_CLASS[team.status.tone]}`}>
                    {team.status.text}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <TeamPerformanceTags performance={team.performance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
