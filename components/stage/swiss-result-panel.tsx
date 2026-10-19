import {
  SWISS_PROGRESS_DISPLAY_ORDER,
  SWISS_RESULT_LOSE_RECORDS,
  SWISS_RESULT_WIN_RECORDS,
} from '@/lib/constants'
import { EmptyState } from '@/components/ui/empty-state'
import { TeamLogoGroup } from '@/components/team/team-logo-group'

import type { SwissResult } from '@/types'

interface RecordRowProps {
  label: string
  teams: string[]
  tone?: 'win' | 'lose' | 'normal'
}

function RecordRow({ label, teams, tone = 'normal' }: RecordRowProps) {
  if (!teams.length) return null

  return (
    <div className="flex items-start gap-2">
      <span className="text-muted w-8 shrink-0 pt-0.5 text-xs text-nowrap">{label}</span>
      <TeamLogoGroup
        teams={teams.map((id) => ({
          id,
          outcome: tone === 'normal' ? undefined : tone,
        }))}
      />
    </div>
  )
}

/** 瑞士轮比赛结果面板：当前战绩 / 晋级 / 淘汰 */
export function SwissResultPanel({ result }: { result: SwissResult }) {
  const inProgress = SWISS_PROGRESS_DISPLAY_ORDER.map((record) => ({
    record,
    teams: result[record],
  })).filter((item) => item.teams.length > 0)

  const advanced = SWISS_RESULT_WIN_RECORDS.map((record) => ({
    record,
    teams: result[record],
  })).filter((item) => item.teams.length > 0)

  const eliminated = SWISS_RESULT_LOSE_RECORDS.map((record) => ({
    record,
    teams: result[record],
  })).filter((item) => item.teams.length > 0)

  if (!inProgress.length && !advanced.length && !eliminated.length) {
    return <EmptyState icon="⚔️" title="比赛进行中" description="结果尚未出炉" />
  }

  return (
    <div className="space-y-4">
      {inProgress.length > 0 && (
        <div>
          <p className="text-secondary mb-2 text-xs font-medium">当前战绩</p>
          <div className="space-y-2">
            {inProgress.map(({ record, teams }) => (
              <RecordRow key={record} label={record} teams={teams} />
            ))}
          </div>
        </div>
      )}

      {advanced.length > 0 && (
        <div>
          <p className="text-win mb-2 font-medium">晋级</p>
          <div className="space-y-2">
            {advanced.map(({ record, teams }) => (
              <RecordRow key={record} label={record} teams={teams} tone="win" />
            ))}
          </div>
        </div>
      )}

      {eliminated.length > 0 && (
        <div>
          <p className="text-lose mb-2 font-medium">淘汰</p>
          <div className="space-y-2">
            {eliminated.map(({ record, teams }) => (
              <RecordRow key={record} label={record} teams={teams} tone="lose" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
