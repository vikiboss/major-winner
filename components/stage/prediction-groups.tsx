import { TeamLogoGroup } from '@/components/team/team-logo-group'

import type { PredictionGroup } from '@/lib/data'
import type { TeamLogoSize } from '@/components/team/team-logo'

interface PredictionGroupsProps {
  groups: PredictionGroup[]
  /** inline：标签与队伍同一行；stacked：标签在上 */
  layout?: 'inline' | 'stacked'
  size?: TeamLogoSize
  /** 只显示队标，不显示队名 */
  hideLabel?: boolean
}

/** 竞猜分组展示（3-0 / 3-X / 0-3 或 四强 / 二强 / 冠军） */
export function PredictionGroups({
  groups,
  layout = 'inline',
  size = 'xs',
  hideLabel = false,
}: PredictionGroupsProps) {
  if (!groups.length) return null

  if (layout === 'stacked') {
    return (
      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="text-muted mb-1 text-xs">{group.label} 预测</p>
            <TeamLogoGroup teams={group.teams} size={size} hideLabel={hideLabel} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2 text-xs">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-muted w-8 shrink-0">{group.label}</span>
          <TeamLogoGroup teams={group.teams} size={size} hideLabel={hideLabel} />
        </div>
      ))}
    </div>
  )
}
