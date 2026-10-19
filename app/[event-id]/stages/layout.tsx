import { getEvent, getStagePredictionCounts, hasPredictions } from '@/lib/data'
import { PageHeader } from '@/components/ui/page-header'
import { StageNav } from './stage-nav'

export default async function StagesLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ 'event-id': string }>
}) {
  const { 'event-id': eventId } = await params

  if (!hasPredictions(eventId)) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:py-8">
        <PageHeader title="各竞猜者、玩家竞猜情况" showUpdatedAt={false}>
          <span className="block">暂无竞猜数据</span>
        </PageHeader>
      </div>
    )
  }

  const event = getEvent(eventId)
  const counts = getStagePredictionCounts(eventId)

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="竞猜情况"
        description={`${event.shortName} · 查看所有竞猜者在各阶段的竞猜情况。Ctrl + F 快速搜索。`}
      />

      <StageNav eventId={eventId} counts={counts} />

      {children}
    </div>
  )
}
