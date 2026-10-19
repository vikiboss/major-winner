import { getPreviewRows, getStageViews } from '@/lib/data'
import { isPlayoffRound } from '@/lib/constants'
import { PredictionStateBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PredictorIdentity } from '@/components/predictor/predictor-identity'
import { PredictionGroups } from './prediction-groups'

import type { TaskStageType } from '@/types'

interface StagePreviewProps {
  eventId: string
  stageId: TaskStageType
  limit?: number
}

/** 首页右侧：当前阶段排名靠前的竞猜预览 */
export function StagePreview({ eventId, stageId, limit = 3 }: StagePreviewProps) {
  const rows = getPreviewRows(eventId, stageId, limit)
  const status = getStageViews(eventId).find((v) => v.id === stageId)?.status ?? 'not_started'

  if (!rows.length) {
    return <EmptyState icon="📝" title="暂无竞猜数据" />
  }

  return (
    <>
      {rows.map((row) => (
        <div key={row.predictor.id} className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <PredictorIdentity predictor={row.predictor} />
            <PredictionStateBadge status={status} passed={row.stage?.passed ?? null} />
          </div>
          {/* 决胜阶段只看当前轮次的竞猜 */}
          <PredictionGroups
            groups={
              isPlayoffRound(stageId)
                ? row.groups.filter((group) => group.taskId === stageId)
                : row.groups
            }
          />
        </div>
      ))}
    </>
  )
}
