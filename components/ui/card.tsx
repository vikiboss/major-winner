import type { ReactNode } from 'react'

interface CardProps {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** 统一的卡片容器：标题栏 + 内容区 */
export function Card({ title, action, children, className = '', bodyClassName = '' }: CardProps) {
  return (
    <div className={`bg-surface-1 border-border rounded-lg border ${className}`}>
      {(title || action) && (
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          {typeof title === 'string' ? (
            <h3 className="text-secondary text-sm font-medium">{title}</h3>
          ) : (
            title
          )}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
