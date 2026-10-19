/**
 * 排序规则集中地。页面里不再写比较函数。
 */

import type { PredictorStats, StagePassStatus } from '@/types'

export interface SortableRow {
  stats: PredictorStats
  /** 当前阶段的通过状态 */
  stage: StagePassStatus | null
  /** 决胜阶段三轮的聚合成绩 */
  aggregate: {
    passed: number
    failed: number
    correct: number
    impossible: number
  }
}

/** 表格排序：先看猜对数，再看已确定错误数 */
export function compareByCorrectFirst(a: SortableRow, b: SortableRow): number {
  return (
    (b.stage?.correctCount ?? 0) - (a.stage?.correctCount ?? 0) ||
    (a.stage?.impossibleCount ?? 0) - (b.stage?.impossibleCount ?? 0) ||
    b.stats.totalPassed - a.stats.totalPassed ||
    b.stats.totalCorrect - a.stats.totalCorrect
  )
}

/** 首页预览排序：先看已经炸掉的数量，再看待定成绩 */
export function compareByImpossibleFirst(a: SortableRow, b: SortableRow): number {
  return (
    (a.stage?.impossibleCount ?? 0) - (b.stage?.impossibleCount ?? 0) ||
    (b.stage?.correctCount ?? 0) - (a.stage?.correctCount ?? 0) ||
    b.stats.totalPassed - a.stats.totalPassed ||
    b.stats.totalCorrect - a.stats.totalCorrect
  )
}

/** 决胜阶段排序：按三轮整体通过情况 */
export function compareByPlayoffs(a: SortableRow, b: SortableRow): number {
  return (
    b.aggregate.passed - a.aggregate.passed ||
    a.aggregate.failed - b.aggregate.failed ||
    b.aggregate.correct - a.aggregate.correct ||
    a.aggregate.impossible - b.aggregate.impossible ||
    b.stats.totalPassed - a.stats.totalPassed
  )
}

/** 排行榜排序 */
export function compareLeaderboard(a: PredictorStats, b: PredictorStats): number {
  return b.totalPassed - a.totalPassed || b.totalCorrect - a.totalCorrect
}

/**
 * 按出现频次降序排列队伍，用于让表格同一列里热门的队伍对齐。
 * @param groups 每一行的同一列队伍 id 列表
 */
export function buildFrequencyRank(groups: string[][]): Map<string, number> {
  const rank = new Map<string, number>()

  for (const teams of groups) {
    for (const team of teams) {
      rank.set(team, (rank.get(team) ?? 0) + 1)
    }
  }

  return rank
}

/** 按频次排名排序队伍 */
export function sortByRank<T extends { id: string }>(teams: T[], rank: Map<string, number>): T[] {
  return teams.toSorted((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0))
}
