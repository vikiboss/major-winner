import { buildRows, getStageViews } from '@/lib/data'
import { TeamLogoGroup } from '@/components/team/team-logo-group'
import { PassMark } from './pass-mark'
import { PredictorCard } from './predictor-card'
import { PredictorTableCell } from './predictor-table-cell'
import { StageTableFrame, type TableColumn } from './stage-table-frame'

import type { SwissStageType } from '@/types'

const COLUMNS: TableColumn[] = [
  { key: 'predictor', header: '竞猜者' },
  { key: '3-0', header: '3-0 预测' },
  { key: '3-X', header: '3-X 预测' },
  { key: '0-3', header: '0-3 预测' },
  { key: 'correct', header: '猜对数', align: 'center' },
  { key: 'status', header: '状态', align: 'center' },
]

/** 瑞士轮竞猜表格 */
export function SwissTable({ eventId, stageId }: { eventId: string; stageId: SwissStageType }) {
  const rows = buildRows(eventId, stageId)
  const status = getStageViews(eventId).find((view) => view.id === stageId)?.status ?? 'not_started'
  const waiting = status === 'waiting' || status === 'not_started'

  return (
    <StageTableFrame
      columns={COLUMNS}
      isEmpty={rows.length === 0}
      mobile={rows.map((row) => (
        <PredictorCard
          key={row.predictor.id}
          row={row}
          right={
            <div className="flex items-center gap-2">
              <PassMark
                hasResults={!waiting}
                status={row.stage ?? undefined}
                waitingText="祈祷中"
                variant="label"
              />
              <span className="text-nowrap">
                <span className="text-primary font-bold">
                  {waiting ? '等待中' : (row.stage?.correctCount ?? 0)}
                </span>
                <span className="text-muted text-xs">/{row.stage?.requiredCount ?? 5}</span>
              </span>
            </div>
          }
        />
      ))}
    >
      {rows.map((row) => (
        <tr key={row.predictor.id} className="hover:bg-surface-2">
          <td className="px-4 py-3">
            <PredictorTableCell row={row} />
          </td>
          {row.groups.map((group) => (
            <td key={group.id} className="px-4 py-3">
              <TeamLogoGroup teams={group.teams} size="xl" hideLabel />
            </td>
          ))}
          <td className="px-4 py-3 text-center">
            <span className="text-primary text-base font-semibold">
              {row.stage?.correctCount ?? 0}
            </span>
          </td>
          <td className="px-4 py-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <PassMark
                hasResults={!waiting}
                status={row.stage ?? undefined}
                waitingText="祈祷中"
                variant="boxed"
              />
              <span className="text-muted text-xs">
                {row.stage?.correctCount ?? 0}/{row.stage?.requiredCount ?? 5}
              </span>
            </div>
          </td>
        </tr>
      ))}
    </StageTableFrame>
  )
}
