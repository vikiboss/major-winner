import type { ReactNode } from 'react'

import type { StageProgressStatus } from '@/types'

/** 语义色调 → Tailwind 类，全站唯一出处 */
export type Tone = 'win' | 'lose' | 'progress' | 'waiting' | 'muted' | 'brand'

const TONE_CLASS: Record<Tone, string> = {
  win: 'bg-win/10 text-win',
  lose: 'bg-lose/10 text-lose',
  progress: 'bg-primary-500/10 text-primary-400 animate-pulse',
  waiting: 'bg-yellow-500/10 text-yellow-400',
  muted: 'bg-surface-2 text-muted',
  brand: 'bg-primary-500/10 text-primary-400',
}

interface BadgeProps {
  tone?: Tone
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'muted', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-nowrap ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

const STAGE_STATUS: Record<StageProgressStatus, { tone: Tone; label: string }> = {
  completed: { tone: 'win', label: '已完成' },
  in_progress: { tone: 'progress', label: '进行中' },
  waiting: { tone: 'waiting', label: '等待中' },
  not_started: { tone: 'muted', label: '未开始' },
}

/** 阶段状态徽标 */
export function StageStatusBadge({ status }: { status: StageProgressStatus }) {
  const { tone, label } = STAGE_STATUS[status]
  return <Badge tone={tone}>{label}</Badge>
}

/** 通过状态徽标：通过 / 未通过 / 祈祷中 */
export function PassBadge({ passed }: { passed: boolean | null }) {
  if (passed === true) return <Badge tone="win">通过</Badge>
  if (passed === false) return <Badge tone="lose">未通过</Badge>
  return <Badge tone="waiting">祈祷中</Badge>
}

/** 结合阶段进度给出徽标：已完成看结果，进行中/等待中给提示 */
export function PredictionStateBadge({
  status,
  passed,
}: {
  status: StageProgressStatus
  passed: boolean | null
}) {
  if (status === 'completed') return <PassBadge passed={passed} />
  if (status === 'in_progress') return <Badge tone="progress">进行中</Badge>
  return <Badge tone="waiting">祈祷中</Badge>
}
