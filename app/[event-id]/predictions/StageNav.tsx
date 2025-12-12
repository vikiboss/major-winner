'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { evt } from '@/lib/data'

import type { MajorStageType } from '@/types'

const STAGES: { id: MajorStageType; label: string }[] = [
  { id: 'stage-1', label: '第一阶段' },
  { id: 'stage-2', label: '第二阶段' },
  { id: 'stage-3', label: '第三阶段' },
  { id: 'playoffs', label: '决胜阶段' },
]

export function StageNav({ eventId }: { eventId: string }) {
  const pathname = usePathname()
  const predictions = evt.getPredictions(eventId)

  // 从路径中提取当前阶段 /predictions/stage-1 -> stage-1
  const currentStage = pathname.split('/').pop()

  return (
    <div className="bg-surface-0 border-border sticky top-12 z-40 -mx-4 mb-6 border-b px-4 py-3 backdrop-blur-sm sm:top-16 sm:-mx-6 sm:px-6">
      <div className="bg-surface-1 border-border rounded-lg border p-1">
        <div className="grid grid-cols-4 gap-1">
          {STAGES.map((stage) => {
            const count = predictions.filter((e) => !!e[stage.id]).length || 0
            const isActive = currentStage === stage.id

            return (
              <Link
                key={stage.id}
                href={`/${eventId}/predictions/${stage.id}`}
                className={`rounded px-2 py-1.5 text-center text-[10px] font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-secondary hover:bg-surface-2 hover-text-primary'
                }`}
              >
                <span>{stage.label}</span>
                {count > 0 ? (
                  <span className="bg-primary-500/10 text-primary-400 ml-1 inline-block rounded-full px-1 text-[10px] font-medium sm:px-2 sm:py-0.5 sm:text-xs">
                    {count}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
