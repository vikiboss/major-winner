import { buildRows, getStageViews } from '@/lib/data'
import { GROUP_LABEL, PLAYOFF_ROUNDS } from '@/lib/constants'
import { TeamLogoGroup } from '@/components/team/team-logo-group'
import { PassMark } from './pass-mark'
import { PredictorCard } from './predictor-card'
import { PredictorTableCell } from './predictor-table-cell'
import { StageTableFrame, type TableColumn } from './stage-table-frame'

import type { PredictorRow } from '@/lib/data'

const COLUMNS: TableColumn[] = [
  { key: 'predictor', header: '竞猜者' },
  { key: '8-to-4', header: '四强预测' },
  { key: '4-to-2', header: '二强预测' },
  { key: '2-to-1', header: '冠军预测' },
  { key: 'correct', header: '猜对数', align: 'center' },
  { key: 'status', header: '状态', align: 'center' },
]

/** 三轮各自的通过标记：四强: ✅ */
function RoundMarks({ row, waiting }: { row: PredictorRow; waiting: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      {PLAYOFF_ROUNDS.map((round) => (
        <div key={round} className="flex items-center gap-1">
          <span className="text-muted text-xs text-nowrap">{GROUP_LABEL[round]}:</span>
          <PassMark hasResults={!waiting} status={row.stageMap[round]} />
        </div>
      ))}
    </div>
  )
}

/** 决胜阶段竞猜表格 */
export function PlayoffsTable({ eventId }: { eventId: string }) {
  const rows = buildRows(eventId, 'playoffs')
  const status =
    getStageViews(eventId).find((view) => view.id === '8-to-4')?.status ?? 'not_started'
  const waiting = status === 'not_started' || status === 'waiting'

  return (
    <StageTableFrame
      columns={COLUMNS}
      isEmpty={rows.length === 0}
      mobile={rows.map((row) => (
        <PredictorCard
          key={row.predictor.id}
          row={row}
          right={
            <div className="flex flex-col items-end gap-1">
              {waiting ? (
                <span className="text-primary text-xs">等待中</span>
              ) : (
                <span className="flex items-baseline gap-1">
                  <span className="text-primary text-lg font-bold">{row.aggregate.correct}</span>
                  <span className="text-muted text-xs">猜对数</span>
                </span>
              )}
              <RoundMarks row={row} waiting={waiting} />
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
            {waiting ? (
              <span className="text-muted text-sm">-</span>
            ) : (
              <span className="text-primary text-base font-semibold">{row.aggregate.correct}</span>
            )}
          </td>
          <td className="px-4 py-3 text-center">
            <div className="flex flex-col items-center">
              <RoundMarks row={row} waiting={waiting} />
            </div>
          </td>
        </tr>
      ))}
    </StageTableFrame>
  )
}
