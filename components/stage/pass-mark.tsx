import type { StagePassStatus } from '@/types'

type PassMarkVariant = 'icon' | 'label' | 'boxed'

interface PassMarkProps {
  /** 该阶段是否已有比赛结果 */
  hasResults: boolean
  status?: StagePassStatus
  /** icon：✅/❌；label：✅ 通过/❌ 已炸；boxed：带底色 */
  variant?: PassMarkVariant
  /** 未出结果时的文案 */
  waitingText?: string
  /** 未决时是否带上 x/y */
  showCount?: boolean
}

const LABEL: Record<'win' | 'lose', string> = { win: '✅ 通过', lose: '❌ 已炸' }

/** 通过状态标记，排行榜 / 竞猜表格 / 决胜轮次通用 */
export function PassMark({
  hasResults,
  status,
  variant = 'icon',
  waitingText = '等待中',
  showCount = false,
}: PassMarkProps) {
  if (!hasResults) {
    return <span className="text-muted/50 text-xs text-nowrap">{waitingText}</span>
  }

  if (!status) return <span className="text-muted">-</span>

  if (status.passed === null) {
    return (
      <span className="text-muted text-xs text-nowrap">
        祈祷中{showCount ? ` ${status.correctCount}/${status.requiredCount}` : ''}
      </span>
    )
  }

  const tone = status.passed ? 'win' : 'lose'

  if (variant === 'boxed') {
    return (
      <span
        className={`inline-block rounded px-2 py-1 text-xs font-medium text-nowrap ${
          status.passed ? 'bg-win/20 text-win' : 'bg-lose/20 text-lose'
        }`}
      >
        {LABEL[tone]}
      </span>
    )
  }

  const text = variant === 'label' ? LABEL[tone] : status.passed ? '✅' : '❌'

  return (
    <span className={`text-xs font-medium text-nowrap ${status.passed ? 'text-win' : 'text-lose'}`}>
      {text}
    </span>
  )
}
