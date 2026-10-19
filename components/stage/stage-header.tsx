import { getStageMeta } from '@/lib/constants'
import { StageStatusBadge } from '@/components/ui/badge'

import type { StageProgressStatus, TaskStageType } from '@/types'

interface StageHeaderProps {
  stageId: TaskStageType
  status?: StageProgressStatus
}

/** 阶段标题：角标 + 名称 + 状态 + 副标题 */
export function StageHeader({ stageId, status }: StageHeaderProps) {
  const meta = getStageMeta(stageId)

  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="bg-primary-500/10 border-primary-500/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border">
        <span className="text-primary-400 font-bold">{meta.badge}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h2 className="text-primary text-xl font-semibold">{meta.label}</h2>
          {status && <StageStatusBadge status={status} />}
        </div>
        <p className="text-muted text-sm">{meta.subtitle}</p>
      </div>
    </div>
  )
}
