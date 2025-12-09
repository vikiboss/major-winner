'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Stage = 'stage-1' | 'stage-2' | 'stage-3' | 'finals'

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: 'stage-1', label: '第一阶段' },
  { id: 'stage-2', label: '第二阶段' },
  { id: 'stage-3', label: '第三阶段' },
  { id: 'finals', label: '决赛阶段' },
]

export function StageNav() {
  const pathname = usePathname()

  // 从路径中提取当前阶段 /predictions/stage-1 -> stage-1
  const currentStage = pathname.split('/').pop() as Stage

  return (
    <div className="bg-surface-1 border-border mb-6 rounded-lg border p-1">
      <div className="grid grid-cols-4 gap-1">
        {STAGES.map((stage) => {
          const isActive = currentStage === stage.id

          return (
            <Link
              key={stage.id}
              href={`/predictions/${stage.id}`}
              className={`rounded px-3 py-2 text-center text-sm font-medium transition-colors sm:px-4 ${
                isActive
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-secondary hover:bg-surface-2 hover-text-primary'
              }`}
            >
              {stage.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
