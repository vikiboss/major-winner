import { PredictorIdentity } from '@/components/predictor/predictor-identity'
import { PredictorStatsLine } from '@/components/predictor/predictor-stats-line'

import type { PredictorRow } from '@/lib/data'

/** 表格里的竞猜者单元格：头像 + 昵称 + 平台 + 总成绩 */
export function PredictorTableCell({ row }: { row: PredictorRow }) {
  return (
    <div className="flex flex-col gap-0.5">
      <PredictorIdentity predictor={row.predictor} avatarSize="md" />
      <PredictorStatsLine stats={row.stats} />
    </div>
  )
}
