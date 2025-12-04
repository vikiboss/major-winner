import Link from 'next/link'
import { events, getAllPredictorStats } from '@/lib/data'

export default function PredictorsPage() {
  const event = events[0]
  const stats = getAllPredictorStats(event.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">预测者</h1>
        <p className="text-muted mt-1 text-sm">{stats.length} 位参与预测</p>
      </div>

      {/* List */}
      <div className="bg-surface-1 border-border divide-border divide-y rounded-lg border">
        {stats.map((stat, index) => (
          <Link
            key={stat.predictor}
            href={`/predictors/${encodeURIComponent(stat.predictor)}`}
            className="hover:bg-surface-2 flex items-center justify-between px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span
                className={`w-6 text-sm font-medium ${
                  index === 0 ? 'text-primary-400' : index < 3 ? 'text-zinc-300' : 'text-muted'
                }`}
              >
                {index + 1}
              </span>
              <div>
                <span className="font-medium text-white">{stat.predictor}</span>
                {stat.platform && <span className="text-muted ml-2 text-xs">{stat.platform}</span>}
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <span className="font-semibold text-white">{stat.totalCorrect}</span>
                <span className="text-muted">/{stat.totalPredictions}</span>
              </div>
              <div className="flex gap-1">
                {stat.stageResults.slice(0, 4).map((r) => (
                  <span
                    key={r.stageId}
                    className={`flex h-5 w-5 items-center justify-center rounded text-xs ${
                      r.passed ? 'bg-win/10 text-win' : 'bg-lose/10 text-lose'
                    }`}
                  >
                    {r.passed ? '✓' : '✗'}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
