import type { TeamPerformanceRecord, TeamPerformanceStatus } from '@/lib/team'

const TONE_CLASS: Record<TeamPerformanceStatus, string> = {
  champion: 'bg-primary-500/20 text-primary-400',
  advanced: 'bg-win/10 text-win',
  eliminated: 'bg-lose/10 text-lose',
  'in-progress': 'bg-primary-500/10 text-primary-400',
  waiting: 'bg-muted/10 text-muted',
}

/** 队伍在各阶段的表现标签（挑战组 3-1 → 传奇组 3-0 …） */
export function TeamPerformanceTags({ performance }: { performance: TeamPerformanceRecord[] }) {
  if (!performance.length) {
    return <span className="text-muted text-sm">暂无数据</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {performance.map((record, index) => {
        const isLast = index === performance.length - 1
        const showArrow =
          isLast &&
          (record.status === 'advanced' || record.status === 'in-progress') &&
          record.result !== '冠军' &&
          record.result !== '亚军'

        return (
          <span
            key={`${record.stage}-${index}`}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${TONE_CLASS[record.status]}`}
          >
            <span className="opacity-70">{record.stageName}</span>
            <span className="font-semibold">{record.result}</span>
            {isLast && record.status === 'eliminated' && <span>✕</span>}
            {showArrow && <span>→</span>}
          </span>
        )
      })}
    </div>
  )
}
