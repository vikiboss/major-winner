import TeamLogo from '@/components/TeamLogo'
import { evt } from '@/lib/data'
import { Metadata } from 'next'
import { STAGE_GROUP_NAME_MAP } from '@/lib/constants'
import { getTeamPerformance, getTeamStatus, sortTeamsByPerformance } from '@/lib/team'

export const metadata: Metadata = {
  title: '参赛队伍',
  description: '查看所有 CS2 Major 参赛队伍的表现和晋级状态。',
}

export async function generateStaticParams() {
  return evt.eventNames.map((e) => ({ 'event-id': e.id }))
}

export default async function TeamsPage({ params }: { params: Promise<{ 'event-id': string }> }) {
  const { 'event-id': eventId } = await params
  const event = evt.getEvent(eventId)

  const sortedTeamsWithExtra = sortTeamsByPerformance(event).map((team) => {
    const performance = getTeamPerformance(event, team.shortName)
    const status = getTeamStatus(event, team.shortName)
    return { ...team, performance, status }
  })

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-primary text-2xl font-bold sm:text-3xl">参赛战队</h1>
        <p className="text-muted mt-1 text-sm">
          {event.name} • 共 {sortedTeamsWithExtra.length} 支队伍
        </p>
      </div>

      {/* Champion Banner */}
      {event.playoffs && event.playoffs.result['2-to-1'].winner && (
        <div className="from-primary-500/20 to-primary-400/10 border-primary-500/30 mb-6 rounded-lg border bg-linear-to-r px-6 py-3 text-center">
          <div className="text-primary-400 text-sm font-medium">
            🏆 Major 冠军{' '}
            {sortedTeamsWithExtra.find(
              (e) => e.shortName === event.playoffs.result['2-to-1'].winner,
            )?.name || '-'}
          </div>
        </div>
      )}

      {/* Teams - Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {sortedTeamsWithExtra.map((team) => {
          return (
            <div key={team.name} className="bg-surface-1 border-border rounded-lg border p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <TeamLogo hideLabel shortName={team.shortName} size="xl" className="rounded-sm" />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-primary text-sm font-medium text-nowrap">{team.name}</h3>
                    <p className="text-muted text-sm">{STAGE_GROUP_NAME_MAP[team.stage]}</p>
                  </div>
                </div>
                <span className={`text-xs ${team.status.className}`}>{team.status.text}</span>
              </div>
              {team.performance.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {team.performance.map((p, idx) => {
                    const isLast = idx === team.performance.length - 1
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          p.status === 'champion'
                            ? 'bg-primary-500/20 text-primary-400'
                            : p.status === 'advanced'
                              ? 'bg-win/10 text-win'
                              : p.status === 'eliminated'
                                ? 'bg-lose/10 text-lose'
                                : p.status === 'waiting'
                                  ? 'bg-muted/10 text-muted'
                                  : 'bg-primary-500/10 text-primary-400'
                        }`}
                      >
                        <span className="opacity-70">{p.stageName}</span>
                        <span className="font-semibold">{p.result}</span>
                        {isLast && p.status === 'eliminated' && <span>✕</span>}
                        {isLast &&
                          (p.status === 'advanced' || p.status === 'in-progress') &&
                          p.result !== '冠军' &&
                          p.result !== '亚军' && <span>→</span>}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Teams Table - Desktop */}
      <div className="bg-surface-1 border-border hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full min-w-[500px]">
          <thead className="bg-surface-2 border-border border-b">
            <tr className="border-border text-primary text-muted border-b text-left text-xs font-medium tracking-wide uppercase">
              <th className="w-12 px-4 py-3">#</th>
              <th className="px-4 py-3">战队</th>
              <th className="px-4 py-3">起始组别</th>
              <th className="px-4 py-3">当前状态</th>
              <th className="px-4 py-3 text-center">比赛战绩</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {sortedTeamsWithExtra.map((team, index) => {
              return (
                <tr
                  key={team.name}
                  className="bg-surface-1 hover:bg-surface-2/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-medium ${
                        index === 0
                          ? 'text-primary-400'
                          : index < 3
                            ? 'text-secondary'
                            : 'text-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <TeamLogo
                        hideLabel
                        shortName={team.shortName}
                        size="lg"
                        className="rounded-sm"
                      />
                      <span className="text-primary text-sm font-medium text-nowrap">
                        {team.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-muted text-sm">{STAGE_GROUP_NAME_MAP[team.stage]}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-sm ${team.status.className}`}>{team.status.text}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {team.performance.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {team.performance.map((p, idx) => {
                          const isLast = idx === team.performance.length - 1
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                                p.status === 'champion'
                                  ? 'bg-primary-500/20 text-primary-400'
                                  : p.status === 'advanced'
                                    ? 'bg-win/10 text-win'
                                    : p.status === 'eliminated'
                                      ? 'bg-lose/10 text-lose'
                                      : p.status === 'waiting'
                                        ? 'bg-muted/10 text-muted'
                                        : 'bg-primary-500/10 text-primary-400'
                              }`}
                            >
                              <span className="opacity-70">{p.stageName}</span>
                              <span className="font-semibold">{p.result}</span>
                              {isLast && p.status === 'eliminated' && <span>✕</span>}
                              {isLast &&
                                (p.status === 'advanced' || p.status === 'in-progress') &&
                                p.result !== '冠军' &&
                                p.result !== '亚军' && <span>→</span>}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-muted text-sm">暂无数据</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
