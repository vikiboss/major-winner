import { formatLastUpdated } from '@/lib/format'

interface PageHeaderProps {
  title: string
  /** 标题下的说明文字 */
  description?: string
  /** 是否显示「最后更新」 */
  showUpdatedAt?: boolean
  /** 追加在说明后的内容 */
  children?: React.ReactNode
}

/** 内容页统一头部 */
export function PageHeader({
  title,
  description,
  showUpdatedAt = true,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-primary text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="text-muted mt-1 text-sm">
        {description}
        {children}
        {showUpdatedAt && (
          <>
            最后更新
            <time className="mx-1">{formatLastUpdated()}</time>。
          </>
        )}
      </p>
    </div>
  )
}
