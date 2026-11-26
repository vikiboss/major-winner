'use client'

import { useCallback, useMemo, useState } from 'react'

import { MAJOR_STAGE_LABEL } from '@/lib/constants'
import { SETTLED_SLOTS } from '@/lib/data/swiss-bracket'
import {
  createBracket,
  getBracketProgress,
  pickWinner,
  seedBracket,
  settleBracket,
  summarizeBracket,
} from '@/lib/data/swiss-bracket'
import { TeamLogo } from '@/components/team/team-logo'

import type { BracketMatch, BracketState, BracketSummary } from '@/lib/data/swiss-bracket'
import type { Match, SwissResultRecord, SwissStageType } from '@/types'

/* -------------------------------------------------------------------------- */
/*                                  类型                                       */
/* -------------------------------------------------------------------------- */

/** 单个瑞士轮阶段的推演素材（服务器组件序列化后传入） */
export interface SimulatorStageInput {
  stageId: SwissStageType
  /** 参赛队伍 id，顺序即种子序 */
  teamIds: string[]
  /** 真实赛程（可为空）；已结束的对局会预置为锁定结果 */
  fixture: Match[]
}

interface SimulatorProps {
  stages: SimulatorStageInput[]
  /** id → 展示名 */
  nameMap: Record<string, string>
}

/* -------------------------------------------------------------------------- */
/*                                  常量                                       */
/* -------------------------------------------------------------------------- */

const ROUNDS = [1, 2, 3, 4, 5] as const

const GROUPS: { record: SwissResultRecord; hint: string; tone: 'win' | 'lose' }[] = [
  { record: '3-0', hint: '全胜', tone: 'win' },
  { record: '3-1', hint: '一负', tone: 'win' },
  { record: '3-2', hint: '两负', tone: 'win' },
  { record: '2-3', hint: '两胜', tone: 'lose' },
  { record: '1-3', hint: '一胜', tone: 'lose' },
  { record: '0-3', hint: '全败', tone: 'lose' },
]

const ROUND_HINT: Record<number, string> = {
  1: '全部 BO1',
  2: '全部 BO1',
  3: '2-0 / 0-2 为 BO3',
  4: '2-1 / 1-2 为 BO3',
  5: '2-2 全部 BO3',
}

/* -------------------------------------------------------------------------- */
/*                                  主体                                       */
/* -------------------------------------------------------------------------- */

export function SimulatorPanel({ stages, nameMap }: SimulatorProps) {
  const [stageId, setStageId] = useState<SwissStageType>(stages[0].stageId)

  // 各阶段的初始状态：真实赛程预置 + 默认按种子强者胜出，一进来就是完整可改的
  const initialStates = useMemo(
    () =>
      Object.fromEntries(stages.map((item) => [item.stageId, buildInitial(item)])) as Record<
        SwissStageType,
        BracketState
      >,
    [stages],
  )

  const [state, setState] = useState<BracketState>(initialStates[stages[0].stageId])

  const stage = useMemo(
    () => stages.find((item) => item.stageId === stageId) ?? stages[0],
    [stages, stageId],
  )

  const switchStage = useCallback(
    (next: SwissStageType) => {
      const target = stages.find((item) => item.stageId === next)
      if (!target) return

      setStageId(next)
      setState(initialStates[next])
    },
    [stages, initialStates],
  )

  const summary = useMemo(() => summarizeBracket(state), [state])
  const progress = useMemo(() => getBracketProgress(state), [state])

  const name = useCallback((id: string) => nameMap[id] ?? id, [nameMap])

  const onPick = useCallback((match: BracketMatch, teamId: string) => {
    // 点当前胜者 = 换成另一方；点另一方 = 选它
    const next = match.winner === teamId ? (teamId === match.a ? match.b : match.a) : teamId
    setState((current) => pickWinner(current, match.id, next))
  }, [])

  return (
    <div className="space-y-4">
      <StageTabs stages={stages} current={stageId} onChange={switchStage} />

      {/* 横向 5 轮面板：左边选完，右边各轮对阵跟着变 */}
      <div className="bg-surface-1 border-border overflow-x-auto rounded-lg border">
        <div className="divide-border grid min-w-245 grid-cols-[repeat(5,minmax(0,1fr))_minmax(150px,0.9fr)] items-stretch divide-x">
          {ROUNDS.map((round) => (
            <RoundColumn
              key={round}
              round={round}
              matches={state.matches}
              groups={summary.groups}
              label={name}
              onPick={onPick}
            />
          ))}

          <ResultColumn summary={summary} label={name} done={progress.done} />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  子组件                                     */
/* -------------------------------------------------------------------------- */

/** 由服务器传入的素材构造初始状态（纯函数，不在渲染期间触发副作用） */
export function buildInitial(stage: SimulatorStageInput): BracketState {
  // 种子序 → 第 1 轮两半同位对位、后续按战绩首尾配对 → 预置已结束结果 → 其余按强者胜出补齐
  return settleBracket(seedBracket(createBracket(stage.teamIds), stage.fixture))
}

function StageTabs({
  stages,
  current,
  onChange,
}: {
  stages: SimulatorStageInput[]
  current: SwissStageType
  onChange: (stageId: SwissStageType) => void
}) {
  return (
    <div className="bg-surface-1 border-border flex gap-1 rounded-lg border p-1">
      {stages.map((stage) => (
        <button
          key={stage.stageId}
          type="button"
          onClick={() => onChange(stage.stageId)}
          className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
            stage.stageId === current
              ? 'bg-primary-500/15 text-primary-400'
              : 'text-secondary hover:bg-surface-2'
          }`}
        >
          {MAJOR_STAGE_LABEL[stage.stageId]}
        </button>
      ))}
    </div>
  )
}

/** 一轮对应的整列：列头 + 上下已定稿分组 + 中间对局 */
function RoundColumn({
  round,
  matches: allMatches,
  groups,
  label,
  onPick,
}: {
  round: number
  matches: BracketMatch[]
  groups: Record<SwissResultRecord, string[]>
  label: (id: string) => string
  onPick: (match: BracketMatch, teamId: string) => void
}) {
  const slots = SETTLED_SLOTS[round]
  const decided = new Set(
    [slots?.top ?? [], slots?.bottom ?? []].flat().flatMap((record) => groups[record] ?? []),
  )
  const matches = allMatches.filter(
    (match) => match.round === round && !decided.has(match.a) && !decided.has(match.b),
  )
  const sections = groupByRecord(matches)

  return (
    <div className="flex min-w-0 flex-col">
      <div className="bg-surface-2 border-border flex items-baseline justify-between gap-1 border-b px-2 py-1.5">
        <span className="text-primary text-xs font-semibold">R{round}</span>
        <span className="text-muted truncate text-[10px]">{ROUND_HINT[round]}</span>
        <span className="text-muted shrink-0 text-[10px] tabular-nums">
          {matches.length ? `${matches.length} 场` : ''}
        </span>
      </div>

      {/* 上端：前面轮次已定稿的晋级组 */}
      <SettledBlock records={slots?.top ?? []} groups={groups} label={label} position="top" />

      {/* 对局少的轮次高度更矮，整体垂直居中；不同战绩组之间留出分界 */}
      <div className="flex flex-1 flex-col justify-center py-2">
        {sections.length === 0 ? (
          <p className="text-muted px-2 text-center text-[11px]">—</p>
        ) : (
          sections.map(({ record, matches: groupMatches }, index) => (
            <div key={record} className={index > 0 ? 'mt-6' : ''}>
              {round > 1 && (
                <p
                  className={`bg-surface-1/60 mb-1 rounded py-0.5 text-center font-mono text-xs font-bold tracking-wide ${recordText(record)}`}
                >
                  {record}
                </p>
              )}
              {groupMatches.map((match) => (
                <Slot key={match.id} match={match} label={label} onPick={onPick} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* 下端：前面轮次已定稿的淘汰组 */}
      <SettledBlock records={slots?.bottom ?? []} groups={groups} label={label} position="bottom" />
    </div>
  )
}

/** 列上下端的已定稿分组（灰色粗框，表示这些队伍已经出线/淘汰） */
function SettledBlock({
  records,
  groups,
  label,
  position,
}: {
  records: SwissResultRecord[]
  groups: Record<SwissResultRecord, string[]>
  label: (id: string) => string
  position: 'top' | 'bottom'
}) {
  const blocks = records
    .map((record) => ({ record, teams: groups[record] ?? [] }))
    .filter((block) => block.teams.length > 0)

  if (!blocks.length) return null

  return (
    // 顶部块贴向下方赛事区，底部块贴向上方赛事区
    <div className={`px-1.5 ${position === 'top' ? 'mt-auto pt-1.5' : 'mb-auto pb-1.5'}`}>
      {blocks.map(({ record, teams }, index) => (
        <div key={record} className={index > 0 ? 'mt-6' : ''}>
          <p
            className={`mb-1 text-center font-mono text-xs font-bold tracking-wide ${recordText(record)}`}
          >
            {record}
          </p>
          <div className="border-border bg-surface-2/60 mx-0.5 rounded-md border-2 px-1 py-1">
            <div className="space-y-px">
              {teams.map((id) => (
                <p
                  key={id}
                  className="text-primary flex items-center gap-1 text-[11px] font-medium"
                >
                  <TeamLogo hideLabel id={id} size="xs" className="shrink-0 rounded-sm" />
                  <span className="truncate">{label(id)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** 一列中的一场对局：两个可点的队伍按钮；真实赛果已锁定时不可切换 */
function Slot({
  match,
  label,
  onPick,
}: {
  match: BracketMatch
  label: (id: string) => string
  onPick: (match: BracketMatch, teamId: string) => void
}) {
  return (
    <div
      className={`mx-1 mb-1 overflow-hidden rounded-md border-2 ${
        match.locked ? 'border-primary-400/32 border-solid' : 'border-primary-400/60 border-dashed'
      }`}
    >
      <div className="bg-surface-1">
        <TeamButton
          id={match.a}
          picked={match.winner === match.a}
          locked={match.locked}
          label={label(match.a)}
          onClick={() => onPick(match, match.a)}
        />
        <TeamButton
          id={match.b}
          picked={match.winner === match.b}
          locked={match.locked}
          label={label(match.b)}
          onClick={() => onPick(match, match.b)}
        />
      </div>
    </div>
  )
}

function TeamButton({
  id,
  picked,
  locked,
  label,
  onClick,
}: {
  id: string
  picked: boolean
  /** 真实赛果已定，整场不可切换 */
  locked: boolean
  label: string
  onClick: () => void
}) {
  const tone = picked
    ? 'bg-win/20 text-win'
    : locked
      ? 'text-muted'
      : 'text-muted hover:bg-surface-2/60 hover:text-secondary'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      title={locked ? '真实赛果，已锁定' : undefined}
      className={`flex w-full items-center gap-1 px-1.5 py-1 text-left transition-colors disabled:cursor-default ${tone} ${locked ? 'opacity-32' : ''}`}
    >
      <TeamLogo hideLabel id={id} size="xs" className="shrink-0 rounded-sm" />
      <span className="truncate text-[11px] font-medium">{label}</span>
      {locked ? (
        <LockIcon className={`ml-auto shrink-0 ${picked ? 'text-primary-500' : ''}`} />
      ) : (
        <MatchArrow up={picked} className="ml-auto shrink-0" />
      )}
    </button>
  )
}

/** 真实赛果的锁图标 */
function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3.5 w-3.5 opacity-80 ${className}`}
      fill="currentColor"
    >
      <path d="M3.5 5V3.75a2.5 2.5 0 1 1 5 0V5h.25c.414 0 .75.336.75.75v4c0 .414-.336.75-.75.75h-5.5A.75.75 0 0 1 2.5 9.75v-4c0-.414.336-.75.75-.75h.25Zm1.25 0h2.5V3.75a1.25 1.25 0 1 0-2.5 0V5Z" />
    </svg>
  )
}

/** 面板最右列：3-0 → 0-3 的结果分组，与各轮并排 */
function ResultColumn({
  summary,
  label,
  done,
}: {
  summary: BracketSummary
  label: (id: string) => string
  done: boolean
}) {
  const pending = Object.values(summary.records).filter(
    (team) => team.wins < 3 && team.losses < 3,
  ).length

  return (
    <div className="bg-surface-2/40 flex min-w-0 flex-col">
      <div className="bg-surface-2 border-border flex items-baseline justify-between gap-1 border-b px-2 py-1.5">
        <span className="text-primary text-xs font-semibold">结果</span>
        <span className={`text-[10px] ${done ? 'text-win' : 'text-muted'}`}>
          {done ? '已定稿' : pending ? `${pending} 队待定` : '推演中'}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 py-2">
        {GROUPS.map((group) => {
          const teams = summary.groups[group.record]
          return (
            <div key={group.record}>
              <p
                className={`mb-1 text-center font-mono text-xs font-bold tracking-wide ${
                  group.tone === 'win' ? 'text-win' : 'text-lose'
                }`}
              >
                {group.record}
              </p>
              <div className="border-border bg-surface-2/60 mx-0.5 rounded-md border-2 px-1 py-1">
                <div className="space-y-px">
                  {teams.length === 0 ? (
                    <p className="text-muted/50 text-center text-[10px]">—</p>
                  ) : (
                    teams.map((id) => (
                      <p
                        key={id}
                        className="text-primary flex items-center gap-1 text-[11px] font-medium"
                      >
                        <TeamLogo hideLabel id={id} size="xs" className="shrink-0 rounded-sm" />
                        <span className="truncate">{label(id)}</span>
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <PendingRecords summary={summary} label={label} />
    </div>
  )
}

/** 列尾：还没分出胜负的队伍，按当前战绩排列 */
function PendingRecords({
  summary,
  label,
}: {
  summary: BracketSummary
  label: (id: string) => string
}) {
  const buckets = new Map<string, string[]>()
  for (const team of Object.values(summary.records)) {
    if (team.wins >= 3 || team.losses >= 3) continue
    const list = buckets.get(team.record) ?? []
    list.push(team.id)
    buckets.set(team.record, list)
  }

  if (!buckets.size) return null

  const keys = [...buckets.keys()].toSorted((a, b) => {
    const [aw, al] = a.split('-').map(Number)
    const [bw, bl] = b.split('-').map(Number)
    return bw - aw || al - bl
  })

  return (
    <div className="border-border border-t px-2 py-1.5">
      <p className="text-muted mb-1 text-[9px]">进行中</p>
      <div className="space-y-0.5">
        {keys.map((record) => (
          <p key={record} className="flex items-start gap-1 text-[10px] leading-tight">
            <span className="text-muted shrink-0 font-mono">{record}</span>
            <span className="text-secondary flex flex-wrap gap-x-1">
              {buckets.get(record)!.map((id) => (
                <span key={id}>{label(id)}</span>
              ))}
            </span>
          </p>
        ))}
      </div>
    </div>
  )
}

/** 队伍标记：胜者向上，败者向下 */
function MatchArrow({ up, className = '' }: { up: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-2 w-2 ${up ? '' : 'rotate-180 opacity-50'} ${className}`}
      fill="currentColor"
    >
      <path d="M6 1.5 11 10H1z" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  工具                                       */
/* -------------------------------------------------------------------------- */

/** 一列里的对局按战绩分组成段（顺序：胜场多的在前） */
function groupByRecord(matches: BracketMatch[]): { record: string; matches: BracketMatch[] }[] {
  const buckets = new Map<string, BracketMatch[]>()
  for (const match of matches) {
    const list = buckets.get(match.group) ?? []
    list.push(match)
    buckets.set(match.group, list)
  }

  return [...buckets.entries()]
    .toSorted(([a], [b]) => {
      const [aw = 0, al = 0] = a.split('-').map(Number)
      const [bw = 0, bl = 0] = b.split('-').map(Number)
      return bw - aw || al - bl
    })
    .map(([record, list]) => ({ record, matches: list }))
}

/** 战绩文字色：晋级 / 淘汰 / 中性 */
function recordText(record: string): string {
  const [wins = 0, losses = 0] = record.split('-').map(Number)
  if (wins >= 3) return 'text-win'
  if (losses >= 3) return 'text-lose'
  return 'text-muted'
}

/** 战绩配色：晋级色 / 淘汰色 / 中性 */
function recordTone(record: string): string {
  const [wins = 0, losses = 0] = record.split('-').map(Number)
  if (wins >= 3) return 'bg-win/10 text-win'
  if (losses >= 3) return 'bg-lose/10 text-lose'
  return 'bg-surface-2 text-secondary'
}
