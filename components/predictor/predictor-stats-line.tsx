import type { PredictorStats } from '@/types'

interface PredictorStatsLineProps {
  stats: PredictorStats
  /** full：竞猜任务/猜对个数；short：任务/猜对 */
  variant?: 'full' | 'short'
  className?: string
}

/** 「任务 3/5 | 猜对 12/40」这类概要统计 */
export function PredictorStatsLine({
  stats,
  variant = 'full',
  className = '',
}: PredictorStatsLineProps) {
  const labels =
    variant === 'full'
      ? { tasks: '竞猜任务', correct: '猜对个数' }
      : { tasks: '任务', correct: '猜对' }

  return (
    <span className={`text-muted text-xs text-nowrap ${className}`}>
      <span className="mr-1 opacity-80">{labels.tasks}</span>
      <span className="font-medium">
        {stats.totalPassed}/{stats.totalStages}
      </span>
      <span className="mx-1 opacity-60">|</span>
      <span className="mr-1 opacity-80">{labels.correct}</span>
      <span className="font-medium">
        {stats.totalCorrect}/{stats.totalPredictions}
      </span>
    </span>
  )
}
