import { EmptyState } from '@/components/ui/empty-state'
import { TeamLogo } from '@/components/team/team-logo'
import { TeamLogoGroup } from '@/components/team/team-logo-group'

import type { PlayoffStageType, PlayoffsStage } from '@/types'

interface PlayoffResultPanelProps {
  round: PlayoffStageType
  playoffs: PlayoffsStage
}

/** 决赛结果 */
function ChampionResult({ winner, loser }: { winner: string; loser: string | null }) {
  return (
    <div>
      <p className="text-primary-400 mb-2 text-xs">🏆 冠军</p>
      <div className="flex items-center gap-2">
        <TeamLogo id={winner} size="lg" hideLabel />
        <p className="text-primary text-lg font-semibold">{winner}</p>
      </div>
      {loser && (
        <div className="text-muted mt-2 flex items-center gap-2 text-sm">
          <TeamLogo id={loser} size="sm" hideLabel />
          <span>亚军: {loser}</span>
        </div>
      )}
    </div>
  )
}

/** 决胜阶段某一轮的比赛结果面板 */
export function PlayoffResultPanel({ round, playoffs }: PlayoffResultPanelProps) {
  const { result } = playoffs

  if (round === '2-to-1') {
    const { winner, loser } = result['2-to-1']
    if (!winner) return <EmptyState icon="⚔️" title="比赛进行中" description="结果尚未出炉" />
    return <ChampionResult winner={winner} loser={loser} />
  }

  const { winners, losers } = result[round]
  if (!winners.length && !losers.length) {
    return <EmptyState icon="⚔️" title="比赛进行中" description="结果尚未出炉" />
  }

  // 本轮参赛但还没打（或结果未录入）的队伍
  const candidates = round === '8-to-4' ? playoffs.teams : result['8-to-4'].winners
  const waiting = candidates.filter((team) => !winners.includes(team) && !losers.includes(team))

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      {waiting.length > 0 && (
        <div>
          <p className="text-muted mb-2 font-medium">等待比赛</p>
          <TeamLogoGroup teams={waiting.map((id) => ({ id }))} />
        </div>
      )}
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-win mb-2 font-medium">晋级</p>
          <TeamLogoGroup teams={winners.map((id) => ({ id, outcome: 'win' as const }))} />
        </div>
        <div className="flex-1">
          <p className="text-lose mb-2 font-medium">淘汰</p>
          <TeamLogoGroup teams={losers.map((id) => ({ id, outcome: 'lose' as const }))} />
        </div>
      </div>
    </div>
  )
}
