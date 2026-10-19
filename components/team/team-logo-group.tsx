import type { TeamOutcome } from '@/types'

import { TeamLogo, type TeamLogoSize, type TeamLogoStatus } from './team-logo'

export interface TeamChip {
  id: string
  outcome?: TeamOutcome
}

const OUTCOME_TO_STATUS: Record<TeamOutcome, TeamLogoStatus> = {
  win: 'win',
  lose: 'lose',
  pending: 'normal',
}

interface TeamLogoGroupProps {
  teams: TeamChip[]
  size?: TeamLogoSize
  hideLabel?: boolean
  className?: string
  /** 空列表时的占位文案 */
  fallback?: string
}

/** 一组战队图标，胜负态由 outcome 决定 */
export function TeamLogoGroup({
  teams,
  size = 'xs',
  hideLabel = false,
  className = '',
  fallback,
}: TeamLogoGroupProps) {
  if (!teams.length) {
    return fallback ? <span className="text-muted text-xs">{fallback}</span> : null
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {teams.map((team) => (
        <TeamLogo
          key={team.id}
          id={team.id}
          size={size}
          hideLabel={hideLabel}
          status={team.outcome ? OUTCOME_TO_STATUS[team.outcome] : 'normal'}
        />
      ))}
    </div>
  )
}
