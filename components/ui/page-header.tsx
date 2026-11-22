import { formatLastUpdated } from '@/lib/format'

interface PageHeaderProps {
  title: string
  /** 标题下的说明文字 */
  description?: string
  /** 是否显示「最后更新」 */
  showUpdatedAt?: boolean
  /** 追加在说明后的内容 */
  children?: React.ReactNode
  /** 「最后更新」之后的内容（如页面入口链接） */
  extra?: React.ReactNode
}

/** 内容页统一头部 */
export function PageHeader({
  title,
  description,
  showUpdatedAt = true,
  children,
  extra,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-primary text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>
          {description}
          {children}
          {showUpdatedAt && (
            <>
              最后更新
              <time className="mx-1">{formatLastUpdated()}</time>。
            </>
          )}
        </span>
        {extra}
      </p>
    </div>
  )
}
