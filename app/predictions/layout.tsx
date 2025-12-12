import { events, evt } from '@/lib/data'
import { StageNav } from './StageNav'

export default function PredictionsLayout({ children }: { children: React.ReactNode }) {
  const event = events[0]
  const predictions = evt.getPredictions(event.id)

  if (!predictions.length) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-primary text-2xl font-bold">各竞猜者、玩家竞猜情况</h1>
          <p className="text-muted mt-1 text-sm">暂无竞猜数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:py-8">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-primary text-2xl font-bold sm:text-3xl">竞猜情况</h1>
        <p className="text-muted mt-1 text-sm">查看所有竞猜者在各阶段的竞猜情况</p>
      </div>

      {/* 阶段切换标签 */}
      <StageNav />

      {/* 动态内容 */}
      {children}
    </div>
  )
}
