/** 展示格式化工具 */

/** 构建时间戳（由 next.config.ts 的 define 注入） */
export function getBuildTime(): Date {
  return new Date(Number(BUILD_AT))
}

/** 站点数据最后更新时间，如 2026/10/19 09:30:33 */
export function formatLastUpdated(): string {
  return getBuildTime().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

/** 段位序号样式：前三名高亮 */
export function rankTone(index: number): string {
  if (index === 0) return 'text-primary-400'
  if (index < 3) return 'text-secondary'
  return 'text-muted'
}
