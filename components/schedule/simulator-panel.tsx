'use client'

import { useCallback, useMemo, useState } from 'react'

import { MAJOR_STAGE_LABEL } from '@/lib/constants'
import { seedRandom, simulateStage } from '@/lib/data/swiss-sim'
import { TeamLogo } from '@/components/team/team-logo'

import type { SimulatedStage } from '@/lib/data/swiss-sim'
import type { SwissResultRecord, SwissStageType } from '@/types'

/** 推演输入的战队快照（服务器组件序列化后传入） */
export interface SimulationTeamInput {
  id: string
  name: string
}

export interface StageTeamPool {
  stageId: SwissStageType
  teams: SimulationTeamInput[]
}

/* -------------------------------------------------------------------------- */
/*                                  组件                                       */
/* -------------------------------------------------------------------------- */

const RESULT_GROUPS: SwissResultRecord[] = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3']

const GROUP_TONE: Record<SwissResultRecord, { label: string; className: string }> = {
  '3-0': { label: '全胜晋级', className: 'text-win' },
  '3-1': { label: '一负晋级', className: 'text-win' },
  '3-2': { label: '两负晋级', className: 'text-win' },
  '2-3': { label: '两胜淘汰', className: 'text-lose' },
  '1-3': { label: '一胜淘汰', className: 'text-lose' },
  '0-3': { label: '全败淘汰', className: 'text-lose' },
}

interface SimulatorPanelProps {
  pools: StageTeamPool[]
  nameMap: Record<string, string>
}

export function SimulatorPanel({ pools, nameMap }: SimulatorPanelProps) {
  const [stageId, setStageId] = useState<SwissStageType>(pools[0]?.stageId ?? 'stage-1')
  const [result, setResult] = useState<SimulatedStage | null>(null)
  const [seed, setSeed] = useState(0)

  const pool = useMemo(
    () => pools.find((item) => item.stageId === stageId) ?? pools[0],
    [pools, stageId],
  )

  const run = useCallback(() => {
    if (!pool?.teams.length) return

    // 每次点击用新的随机源，结果才真正「随机」
    const random = seedRandom(Date.now() + Math.floor(Math.random() * 1e9))
    setResult(simulateStage(pool.teams.map((team) => team.id), random))
    setSeed((value) => value + 1)
  }, [pool])

  const label = (id: string) => nameMap[id] ?? id

  return (
    <div className="space-y-6">
      {/* 控制区 */}
      <div className="bg-surface-1 border-border rounded-lg border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {pools.map((item) => (
              <button
                key={item.stageId}
                type="button"
                onClick={() => {
                  setStageId(item.stageId)
                  setResult(null)
                }}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  item.stageId === stageId
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-secondary bg-surface-2 hover:text-primary'
                }`}
              >
                {MAJOR_STAGE_LABEL[item.stageId]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={run}
            className="bg-primary-500 hover:bg-primary-600 rounded px-4 py-2 text-sm font-semibold text-white transition-colors active:scale-95"
          >
            {result ? '重新推演' : '开始推演'}
          </button>
        </div>

        <p className="text-muted mt-3 text-xs">
          按 CS2 瑞士轮规则模拟：同战绩交手、Buchholz 分排序、首尾配对、规避重赛；2-x 组与
          0-2 组为 BO3，其余 BO1。每支队伍每场胜率相同（50%）。
        </p>
      </div>

      {!result ? (
        <div className="text-muted bg-surface-1 border-border rounded-lg border py-12 text-center">
          <div className="mb-2 text-2xl">🎲</div>
          <p className="text-sm">点击「开始推演」查看可能的晋级与淘汰分组</p>
        </div>
      ) : (
        <>
          {/* 结果分组 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RESULT_GROUPS.map((record) => {
              const tone = GROUP_TONE[record]
              const teams = result.groups[record]

              return (
                <div
                  key={record}
                  className="bg-surface-1 border-border rounded-lg border p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-sm font-semibold ${tone.className}`}>{record}</span>
                    <span className="text-muted text-xs">{tone.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {teams.length === 0 ? (
                      <span className="text-muted text-xs">—</span>
                    ) : (
                      teams.map((id) => (
                        <span
                          key={id}
                          className="bg-surface-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                        >
                          <TeamLogo hideLabel id={id} size="xs" className="rounded-sm" />
                          {label(id)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 轮次明细 */}
          <div className="bg-surface-1 border-border rounded-lg border">
            <div className="border-border border-b px-4 py-3">
              <h3 className="text-secondary text-sm font-medium">
                推演对局明细（第 {seed} 次推演）
              </h3>
            </div>
            <div className="divide-border max-h-100 divide-y overflow-y-auto">
              {Array.from({ length: 5 }, (_, index) => index + 1).map((round) => {
                const matches = result.matches.filter((item) => item.round === round)
                if (!matches.length) return null

                return (
                  <div key={round} className="px-4 py-3">
                    <p className="text-muted mb-2 text-xs font-medium">第 {round} 轮</p>
                    <div className="space-y-1">
                      {matches.map((match, index) => (
                        <div
                          key={`${match.a}-${match.b}-${index}`}
                          className="flex flex-wrap items-center gap-2 text-xs"
                        >
                          <span className="text-muted w-14 shrink-0 tabular-nums">{match.group}</span>
                          <span className="bg-surface-2 text-muted rounded px-1.5 py-0.5">
                            {match.format.toUpperCase()}
                          </span>
                          <span className="text-primary">{label(match.a)}</span>
                          <span className="text-muted">vs</span>
                          <span className="text-primary">{label(match.b)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
