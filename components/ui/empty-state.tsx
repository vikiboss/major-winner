import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  className?: string
  children?: ReactNode
}

/** 空状态 / 占位提示 */
export function EmptyState({
  icon,
  title,
  description,
  className = '',
  children,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col text-muted py-8 text-center ${className}`}>
      <div className="mb-2 text-2xl">{icon}</div>
      <p className="text-sm">{title}</p>
      {description && <p className="text-muted mt-1 text-xs">{description}</p>}
      {children}
    </div>
  )
}
