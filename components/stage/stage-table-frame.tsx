import type { ReactNode } from 'react'

export interface TableColumn {
  key: string
  header: string
  align?: 'left' | 'center'
  className?: string
}

interface StageTableFrameProps {
  columns: TableColumn[]
  /** 桌面端 tbody 内容 */
  children: ReactNode
  /** 移动端卡片内容 */
  mobile: ReactNode
  isEmpty: boolean
  emptyText?: string
}

/** 桌面表格 + 移动卡片的统一外壳 */
export function StageTableFrame({
  columns,
  children,
  mobile,
  isEmpty,
  emptyText = '暂无竞猜数据',
}: StageTableFrameProps) {
  return (
    <div className="bg-surface-1 border-border overflow-hidden rounded-lg border">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-surface-2 border-border border-b">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-secondary px-4 py-3 text-sm font-medium text-nowrap ${
                    column.align === 'center' ? 'text-center' : 'text-left'
                  } ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {children}
            {isEmpty && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-3 text-center">
                  <span className="text-muted text-sm">{emptyText}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-border divide-y md:hidden">
        {mobile}
        {isEmpty && (
          <div className="w-full px-4 py-3 text-center">
            <span className="text-muted text-sm">{emptyText}</span>
          </div>
        )}
      </div>
    </div>
  )
}
