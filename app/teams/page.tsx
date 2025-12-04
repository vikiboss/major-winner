import { events } from '../../lib/data'

export default function TeamsPage() {
  const event = events[0]
  const teams = event.teams

  const getTeamPerformance = (shortName: string) => {
    const performance: {
      stage: string
      stageName: string
      result: string
      status: 'advanced' | 'eliminated' | 'champion' | 'in-progress' | 'waiting'
    }[] = []

    // 检查瑞士轮阶段
    for (const stageKey of ['stage-1', 'stage-2', 'stage-3'] as const) {
      const stage = event[stageKey]

      if (!stage) continue

      const stageName = {
        'stage-1': '挑战组',
        'stage-2': '传奇组',
        'stage-3': '冠军组',
      }[stageKey]

      const { result } = stage

      // 检查该队伍是否在本阶段参赛
      const isInStage = stage.teams.includes(shortName) || stage.advancedTeams?.includes(shortName)

      if (!isInStage) continue

      // 检查进行中的战绩
      let foundInProgress = false
      for (const record of ['1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2'] as const) {
        if (result[record]?.includes(shortName)) {
          performance.push({ stage: stageKey, stageName, result: record, status: 'in-progress' })
          foundInProgress = true
          break
        }
      }

      if (foundInProgress) continue

      // 检查晋级结果
      let foundResult = false
      for (const record of ['3-0', '3-1', '3-2'] as const) {
        if (result[record].includes(shortName)) {
          performance.push({ stage: stageKey, stageName, result: record, status: 'advanced' })
          foundResult = true
          break
        }
      }

      if (foundResult) continue

      // 检查淘汰结果
      for (const record of ['2-3', '1-3', '0-3'] as const) {
        if (result[record].includes(shortName)) {
          performance.push({ stage: stageKey, stageName, result: record, status: 'eliminated' })
          foundResult = true
          break
        }
      }

      // 如果在本阶段但没有任何结果,说明等待比赛
      if (!foundResult && !foundInProgress) {
        performance.push({ stage: stageKey, stageName, result: '待赛', status: 'waiting' })
      }
    }

    // 检查决赛阶段 - 只有真正在决赛名单中的队伍才显示决赛信息
    if (event.finals && event.finals.teams.length > 0 && event.finals.teams.includes(shortName)) {
      const finals = event.finals
      if (finals.result['2-to-1'].winner === shortName) {
        performance.push({ stage: 'finals', stageName: '决赛', result: '冠军', status: 'champion' })
      } else if (finals.result['2-to-1'].loser === shortName) {
        performance.push({
          stage: 'finals',
          stageName: '决赛',
          result: '亚军',
          status: 'advanced',
        })
      } else if (finals.result['4-to-2'].losers.includes(shortName)) {
        performance.push({
          stage: 'finals',
          stageName: '半决赛',
          result: '四强',
          status: 'eliminated',
        })
      } else if (finals.result['8-to-4'].losers.includes(shortName)) {
        performance.push({
          stage: 'finals',
          stageName: '四分之一决赛',
          result: '八强',
          status: 'eliminated',
        })
      } else {
        // 在决赛名单中但还没有结果,说明等待决赛
        performance.push({
          stage: 'finals',
          stageName: '决赛',
          result: '待赛',
          status: 'waiting',
        })
      }
    }

    return performance
  }

  // 获取战队当前状态
  const getTeamStatus = (shortName: string) => {
    const performance = getTeamPerformance(shortName)
    const lastPerf = performance[performance.length - 1]

    if (!lastPerf) return { text: '未开赛', className: 'text-muted' }
    if (lastPerf.status === 'champion')
      return { text: '🏆 冠军', className: 'text-primary-400 font-semibold' }
    if (lastPerf.status === 'in-progress') return { text: '比赛中', className: 'text-yellow-400' }
    if (lastPerf.status === 'waiting') return { text: '等待比赛', className: 'text-muted' }
    if (lastPerf.status === 'advanced' && lastPerf.result === '亚军')
      return { text: '🥈 亚军', className: 'text-primary-300 font-semibold' }
    if (lastPerf.status === 'eliminated')
      return { text: `已淘汰 (${lastPerf.stageName})`, className: 'text-lose' }
    if (lastPerf.status === 'advanced') return { text: '晋级中', className: 'text-win' }

    return { text: '进行中', className: 'text-muted' }
  }

  // 排序逻辑:
  // 1. 冠军 > 亚军 > 四强 > 八强 (决赛成绩)
  // 2. 比赛中 > 待赛 > 晋级 > 已淘汰 (当前状态)
  // 3. stage-3 > stage-2 > stage-1 (所在阶段)
  // 4. 3-0 > 3-1 > 3-2 (晋级成绩)
  const sortedTeams = [...teams].toSorted((a, b) => {
    const aPerf = getTeamPerformance(a.shortName)
    const bPerf = getTeamPerformance(b.shortName)
    const lastA = aPerf[aPerf.length - 1]
    const lastB = bPerf[bPerf.length - 1]

    // 1. 决赛成绩优先 (冠军 > 亚军 > 四强 > 八强)
    const aFinals = aPerf.find((p) => p.stage === 'finals')
    const bFinals = bPerf.find((p) => p.stage === 'finals')
    if (aFinals && !bFinals) return -1
    if (!aFinals && bFinals) return 1
    if (aFinals && bFinals) {
      const finalsOrder = ['冠军', '亚军', '四强', '八强']
      return finalsOrder.indexOf(aFinals.result) - finalsOrder.indexOf(bFinals.result)
    }

    // 2. 按当前状态排序 (比赛中 > 待赛 > 晋级 > 已淘汰)
    const statusOrder: Record<string, number> = {
      'in-progress': 0,
      waiting: 1,
      advanced: 2,
      eliminated: 3,
      champion: 0,
    }
    const aStatus = lastA?.status || 'eliminated'
    const bStatus = lastB?.status || 'eliminated'
    if (statusOrder[aStatus] !== statusOrder[bStatus]) {
      return statusOrder[aStatus] - statusOrder[bStatus]
    }

    // 3. 按所在阶段排序 (stage-3 > stage-2 > stage-1)
    const stageOrder: Record<string, number> = {
      'stage-3': 0,
      'stage-2': 1,
      'stage-1': 2,
      finals: 0,
    }
    const aStage = lastA?.stage || a.stage
    const bStage = lastB?.stage || b.stage
    if (stageOrder[aStage] !== stageOrder[bStage]) {
      return stageOrder[aStage] - stageOrder[bStage]
    }

    // 4. 晋级队伍按成绩排序 (3-0 > 3-1 > 3-2)
    if (aStatus === 'advanced' && bStatus === 'advanced') {
      const resultOrder: Record<string, number> = { '3-0': 0, '3-1': 1, '3-2': 2 }
      const aResult = lastA?.result || ''
      const bResult = lastB?.result || ''
      if (resultOrder[aResult] !== undefined && resultOrder[bResult] !== undefined) {
        return resultOrder[aResult] - resultOrder[bResult]
      }
    }

    // 5. 已淘汰队伍按淘汰成绩排序 (2-3 > 1-3 > 0-3, 越接近晋级越靠前)
    if (aStatus === 'eliminated' && bStatus === 'eliminated') {
      const eliminatedOrder: Record<string, number> = { '2-3': 0, '1-3': 1, '0-3': 2 }
      const aResult = lastA?.result || ''
      const bResult = lastB?.result || ''
      if (eliminatedOrder[aResult] !== undefined && eliminatedOrder[bResult] !== undefined) {
        return eliminatedOrder[aResult] - eliminatedOrder[bResult]
      }
    }

    // 6. 默认按起始阶段排序
    return (stageOrder[a.stage] || 999) - (stageOrder[b.stage] || 999)
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">参赛战队</h1>
        <p className="text-muted mt-1 text-sm">
          {event.name} • 共 {teams.length} 支队伍
        </p>
      </div>

      {/* Champion Banner */}
      {event.finals && event.finals.result['2-to-1'].winner && (
        <div className="from-primary-500/20 to-primary-400/10 border-primary-500/30 mb-6 rounded-lg border bg-linear-to-r px-6 py-3 text-center">
          <span className="text-primary-400 text-sm font-medium">
            🏆 Major 冠军: {event.finals.result['2-to-1'].winner}
          </span>
        </div>
      )}

      {/* Teams Table */}
      <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead className="bg-surface-2 border-border border-b">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wide text-white uppercase">
                战队
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wide text-white uppercase">
                起始组别
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wide text-white uppercase">
                当前状态
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wide text-white uppercase">
                比赛战绩
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {sortedTeams.map((team) => {
              const performance = getTeamPerformance(team.shortName)
              const status = getTeamStatus(team.shortName)

              return (
                <tr key={team.name} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-white">{team.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-muted text-sm">
                      {team.stage === 'stage-1'
                        ? '挑战组'
                        : team.stage === 'stage-2'
                          ? '传奇组'
                          : '冠军组'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-sm ${status.className}`}>{status.text}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {performance.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {performance.map((p, idx) => {
                          const isLast = idx === performance.length - 1
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
                                        : 'bg-yellow-500/10 text-yellow-400'
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
