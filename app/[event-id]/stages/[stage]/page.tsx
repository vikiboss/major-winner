import { notFound } from 'next/navigation'

import { eventSummaries, hasPredictions } from '@/lib/data'
import { MAJOR_STAGE_LABEL, MAJOR_STAGES, isMajorStage } from '@/lib/constants'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayoffsTable } from '@/components/stage/playoffs-table'
import { SwissTable } from '@/components/stage/swiss-table'

import type { Metadata } from 'next'

interface StagePageProps {
  params: Promise<{ stage: string; 'event-id': string }>
}

export async function generateMetadata({ params }: StagePageProps): Promise<Metadata> {
  const { stage } = await params
  const stageName = isMajorStage(stage) ? MAJOR_STAGE_LABEL[stage] : stage

  return {
    title: `${stageName}竞猜详情`,
    description: `查看 CS2 Major ${stageName}阶段的详细竞猜情况和结果。`,
  }
}

export async function generateStaticParams() {
  return eventSummaries.flatMap((event) =>
    MAJOR_STAGES.map((stage) => ({ 'event-id': event.id, stage })),
  )
}

export default async function StagePage({ params }: StagePageProps) {
  const { stage, 'event-id': eventId } = await params

  if (!isMajorStage(stage)) notFound()

  if (!hasPredictions(eventId)) {
    return <EmptyState icon="📝" title="暂无竞猜数据" />
  }

  return (
    <>
      {stage === 'playoffs' ? (
        <PlayoffsTable eventId={eventId} />
      ) : (
        <SwissTable eventId={eventId} stageId={stage} />
      )}
      <p className="text-muted mt-4 text-center text-sm">更多数据正在持续整理中，敬请期待 ✨</p>
    </>
  )
}
