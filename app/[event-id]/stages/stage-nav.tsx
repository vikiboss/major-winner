'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { MAJOR_STAGES, MAJOR_STAGE_LABEL } from '@/lib/constants'

import type { MajorStageType } from '@/types'

interface StageNavProps {
  eventId: string
  /** 各阶段参与竞猜的人数，由服务端算好传入 */
  counts: Record<MajorStageType, number>
}

/** 竞猜页的阶段切换标签 */
export function StageNav({ eventId, counts }: StageNavProps) {
  const pathname = usePathname()
  const currentStage = pathname.split('/').pop()

  return (
    <div className="bg-surface-0 border-border sticky top-12 z-40 -mx-4 mb-6 border-b px-4 py-3 backdrop-blur-sm sm:top-16 sm:-mx-6 sm:px-6">
      <div className="bg-surface-1 border-border rounded-lg border p-1">
        <div className="grid grid-cols-4 gap-1">
          {MAJOR_STAGES.map((stageId) => {
            const count = counts[stageId] ?? 0
            const isActive = currentStage === stageId

            return (
              <Link
                key={stageId}
                href={`/${eventId}/stages/${stageId}`}
                className={`rounded px-1.5 py-1 text-center text-[10px] font-medium transition-colors sm:px-2 sm:py-1.5 sm:text-sm ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-secondary hover:bg-surface-2 hover-text-primary'
                }`}
              >
                <span>{MAJOR_STAGE_LABEL[stageId]}</span>
                {count > 0 && (
                  <span className="bg-primary-500/10 text-primary-400 ml-1 inline-block rounded-full px-1 text-[8px] font-medium sm:px-2 sm:py-0.5 sm:text-xs">
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
