import { events } from '../../lib/data'
import TeamLogo from '../../components/TeamLogo'

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

  // 排序逻辑 - 实力越强越靠前:
  // 1. 决赛成绩优先: 冠军 > 亚军 > 四强 > 八强 > 未进决赛
  // 2. 瑞士轮晋级: 3-0 > 3-1 > 3-2 (更强的晋级成绩靠前)
  // 3. 比赛状态: 晋级/比赛中 > 待赛 > 淘汰
  // 4. 淘汰队伍: 2-3 > 1-3 > 0-3 (接近晋级的靠前)
  // 5. 所在阶段: stage-3 > stage-2 > stage-1 (更高阶段靠前)
  const sortedTeams = [...teams].toSorted((a, b) => {
    const aPerf = getTeamPerformance(a.shortName)
    const bPerf = getTeamPerformance(b.shortName)
    const lastA = aPerf[aPerf.length - 1]
    const lastB = bPerf[bPerf.length - 1]

    // 1. 决赛成绩 - 最强的证明
    const aFinals = aPerf.find((p) => p.stage === 'finals')
    const bFinals = bPerf.find((p) => p.stage === 'finals')

    // 进决赛的队伍一定强于未进决赛的
    if (aFinals && !bFinals) return -1
    if (!aFinals && bFinals) return 1

    // 决赛内部排序
    if (aFinals && bFinals) {
      const finalsRank = { 冠军: 1, 亚军: 2, 四强: 3, 八强: 4 }
      const aRank = finalsRank[aFinals.result as keyof typeof finalsRank] || 999
      const bRank = finalsRank[bFinals.result as keyof typeof finalsRank] || 999
      if (aRank !== bRank) return aRank - bRank
    }

    // 2. 瑞士轮战绩 - 胜率和净胜场代表实力
    const getSwissStrength = (perf: typeof lastA) => {
      if (!perf) return 999
      // 最终成绩: 3-0 最强,0-3 最弱
      const finalScores = { '3-0': 1, '3-1': 2, '3-2': 3, '2-3': 4, '1-3': 5, '0-3': 6 }
      // 进行中成绩: 按胜率排序 (2-0 > 2-1 > 1-0 > 2-2 > 1-1 > 0-1 > 1-2 > 0-2)
      const inProgressScores = {
        '2-0': 10,
        '2-1': 11,
        '1-0': 12,
        '2-2': 13,
        '1-1': 14,
        '0-1': 15,
        '1-2': 16,
        '0-2': 17,
      }

      const result = perf.result as string
      return (
        finalScores[result as keyof typeof finalScores] ||
        inProgressScores[result as keyof typeof inProgressScores] ||
        999
      )
    }

    const aSwiss = getSwissStrength(lastA)
    const bSwiss = getSwissStrength(lastB)

    // 同为晋级、同为淘汰、或同为进行中时,按战绩排序
    const aStatus = lastA?.status || 'eliminated'
    const bStatus = lastB?.status || 'eliminated'

    if (
      (aStatus === 'advanced' && bStatus === 'advanced') ||
      (aStatus === 'eliminated' && bStatus === 'eliminated') ||
      (aStatus === 'in-progress' && bStatus === 'in-progress')
    ) {
      if (aSwiss !== bSwiss) return aSwiss - bSwiss
    }

    // 3. 竞技状态 - 晋级/进行中 > 待赛 > 淘汰
    const statusStrength = {
      champion: 1, // 冠军最强
      advanced: 2, // 晋级中
      'in-progress': 2, // 比赛中 (可能晋级)
      waiting: 3, // 待赛
      eliminated: 4, // 已淘汰
    }
    const aStatusRank = statusStrength[aStatus] || 999
    const bStatusRank = statusStrength[bStatus] || 999
    if (aStatusRank !== bStatusRank) return aStatusRank - bStatusRank

    // 4. 所在阶段 - 更高阶段代表更强
    const stageStrength = {
      finals: 1,
      'stage-3': 2,
      'stage-2': 3,
      'stage-1': 4,
    }
    const aStage = lastA?.stage || a.stage
    const bStage = lastB?.stage || b.stage
    const aStageRank = stageStrength[aStage as keyof typeof stageStrength] || 999
    const bStageRank = stageStrength[bStage as keyof typeof stageStrength] || 999
    if (aStageRank !== bStageRank) return aStageRank - bStageRank

    // 5. 默认按起始阶段排序 (高阶段起点 = 实力强)
    const startStageRank = stageStrength[a.stage as keyof typeof stageStrength] || 999
    const startStageRank2 = stageStrength[b.stage as keyof typeof stageStrength] || 999
    return startStageRank - startStageRank2
  })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-primary text-2xl font-bold">参赛战队</h1>
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

      {/* Teams - Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {sortedTeams.map((team) => {
          const performance = getTeamPerformance(team.shortName)
          const status = getTeamStatus(team.shortName)

          return (
            <div key={team.name} className="bg-surface-1 border-border rounded-lg border p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <TeamLogo shortName={team.shortName} size="lg" className="mt-0.5" />
                  <div>
                    <h3 className="text-primary font-medium">{team.name}</h3>
                    <p className="text-muted mt-1 text-xs">
                      {team.stage === 'stage-1'
                        ? '挑战组'
                        : team.stage === 'stage-2'
                          ? '传奇组'
                          : '冠军组'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs ${status.className}`}>{status.text}</span>
              </div>
              {performance.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {performance.map((p, idx) => {
                    const isLast = idx === performance.length - 1
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
              )}
            </div>
          )
        })}
      </div>

      {/* Teams Table - Desktop */}
      <div className="hidden overflow-x-auto rounded-lg md:block">
        <table className="w-full min-w-[500px]">
          <thead className="bg-surface-2 border-border border-b">
            <tr>
              <th className="text-primary px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
                战队
              </th>
              <th className="text-primary px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
                起始组别
              </th>
              <th className="text-primary px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
                当前状态
              </th>
              <th className="text-primary px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
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
                    <div className="flex items-center gap-2">
                      <TeamLogo shortName={team.shortName} size="md" />
                      <span className="text-primary font-medium">{team.name}</span>
                    </div>
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
