import { events } from '@/lib/data'

export default function TeamsPage() {
  const event = events[0]
  const teams = event.teams

  const getTeamPerformance = (teamName: string) => {
    const performance: {
      stage: string
      result: string
      status: 'advanced' | 'eliminated' | 'champion'
    }[] = []

    for (const stageKey of ['stage-1', 'stage-2', 'stage-3'] as const) {
      const stage = event[stageKey]
      if (!stage) continue
      const { result } = stage
      for (const record of ['3-0', '3-1', '3-2'] as const) {
        if (result[record].includes(teamName)) {
          performance.push({ stage: stageKey, result: record, status: 'advanced' })
          break
        }
      }
      for (const record of ['2-3', '1-3', '0-3'] as const) {
        if (result[record].includes(teamName)) {
          performance.push({ stage: stageKey, result: record, status: 'eliminated' })
          break
        }
      }
    }

    if (event.finals) {
      const finals = event.finals
      if (finals.result['2-to-1'].winner === teamName) {
        performance.push({ stage: 'finals', result: '冠军', status: 'champion' })
      } else if (finals.result['2-to-1'].loser === teamName) {
        performance.push({ stage: 'finals', result: '亚军', status: 'advanced' })
      } else if (finals.result['4-to-2'].losers.includes(teamName)) {
        performance.push({ stage: 'finals', result: '四强', status: 'eliminated' })
      } else if (finals.result['8-to-4'].losers.includes(teamName)) {
        performance.push({ stage: 'finals', result: '八强', status: 'eliminated' })
      }
    }
    return performance
  }

  const sortedTeams = [...teams].sort((a, b) => {
    const aPerf = getTeamPerformance(a.name)
    const bPerf = getTeamPerformance(b.name)
    const aFinals = aPerf.find((p) => p.stage === 'finals')
    const bFinals = bPerf.find((p) => p.stage === 'finals')
    if (aFinals && !bFinals) return -1
    if (!aFinals && bFinals) return 1
    if (aFinals && bFinals) {
      const order = ['冠军', '亚军', '四强', '八强']
      return order.indexOf(aFinals.result) - order.indexOf(bFinals.result)
    }
    const lastA = aPerf[aPerf.length - 1]
    const lastB = bPerf[bPerf.length - 1]
    if (lastA && lastB) {
      const stageOrder = ['stage-3', 'stage-2', 'stage-1']
      const aStageIdx = stageOrder.indexOf(lastA.stage)
      const bStageIdx = stageOrder.indexOf(lastB.stage)
      if (aStageIdx !== bStageIdx) return aStageIdx - bStageIdx
    }
    return 0
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">战队</h1>
        <p className="text-muted mt-1 text-sm">{teams.length} 支参赛队伍</p>
      </div>

      {/* Champion */}
      {event.finals && event.finals.result['2-to-1'].winner && (
        <div className="bg-surface-1 border-primary-500/20 mb-6 rounded-lg border p-6 text-center">
          <p className="text-primary-400 mb-1 text-xs">🏆 冠军</p>
          <h2 className="text-2xl font-semibold text-white">
            {event.finals.result['2-to-1'].winner}
          </h2>
        </div>
      )}

      {/* Teams List */}
      <div className="bg-surface-1 border-border divide-border divide-y rounded-lg border">
        {sortedTeams.map((team) => {
          const performance = getTeamPerformance(team.name)
          const lastPerf = performance[performance.length - 1]
          const isChampion = lastPerf?.status === 'champion'

          return (
            <div key={team.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`font-medium ${isChampion ? 'text-primary-400' : 'text-white'}`}>
                  {team.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {performance.map((p, idx) => (
                  <span
                    key={idx}
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      p.status === 'champion'
                        ? 'bg-primary-500/10 text-primary-400'
                        : p.status === 'advanced'
                          ? 'bg-win/10 text-win'
                          : 'bg-lose/10 text-lose'
                    }`}
                  >
                    {p.result}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
