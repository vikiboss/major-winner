import { PredictorStatsLine } from '@/components/predictor/predictor-stats-line'
import { PredictorIdentity } from '@/components/predictor/predictor-identity'
import { PredictionGroups } from './prediction-groups'

import type { PredictorRow } from '@/lib/data'
import type { ReactNode } from 'react'

interface PredictorCardProps {
  row: PredictorRow
  /** 右上角的状态区 */
  right?: ReactNode
}

/** 移动端：一位竞猜者的卡片 */
export function PredictorCard({ row, right }: PredictorCardProps) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <PredictorIdentity predictor={row.predictor} avatarSize="sm" />
          <PredictorStatsLine stats={row.stats} variant="short" />
        </div>
        {right}
      </div>
      <PredictionGroups groups={row.groups} layout="stacked" size="xl" hideLabel />
    </div>
  )
}
