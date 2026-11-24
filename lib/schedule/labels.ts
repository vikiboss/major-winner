/**
 * 赛程面板的阶段展示（纯函数模块，不含 React）。
 *
 * ⚠️ 必须放在组件文件之外：本项目开启了 `reactCompiler.compilationMode: 'all'`，
 * 组件文件里的函数会被编译器当成组件优化并注入 `useMemoCache`，
 * 在渲染期之外调用会抛 `Invalid hook call`。
 *
 * ## 接口实测（PW 赛事中心 `getMatchList`）
 *
 * Major 被拆成多个 event，但**每个阶段都有自己的 eventId**：
 *
 * | eventId | 赛事名 | 阶段 | `star` |
 * | ------- | ------ | ---- | ------ |
 * | 9303 | `PGL Singapore Major 2026 Stage 1` | 第一阶段 | 1 |
 * | 9304 | `PGL Singapore Major 2026 Stage 2` | 第二 / 第三阶段 | 1 |
 * | 8302 | `PGL Major Singapore 2026` | 决胜阶段 | **2** |
 *
 * 两个要点：
 * 1. **决胜阶段的赛事名与主赛事同名**，完全不带 `Stage N` → 靠「有阶段名 / 无阶段名」+ `star` 区分
 * 2. **第二与第三阶段共用同一个 eventId 和 `Stage 2` 的名字**，接口层面无法区分；
 *    好在第三阶段的赛程在本赛事里也被上游标成了 `Stage 2`，只能按上游给的阶段名展示
 */

import type { ScheduleMatch } from '@/types'

/** 接口赛事名里的阶段信息：中文「第N阶段」或英文 `Stage N` */
const STAGE_PATTERN = /第\s*([0-9一二三四五六七八九十]+)\s*阶段|\bStage\s*([0-9]+)\b/i

/** 决胜阶段外，赛事方还把这个重要度用于 knockout 对局 */
const PLAYOFF_STAR = 2

/**
 * 是否决胜阶段（淘汰赛）。
 *
 * 判据（任一命中即算）：
 * 1. 赛事方标记的重要度为 2 —— 瑞士轮（含第三阶段）全部是 1，淘汰赛是 2
 * 2. 赛事名里没有任何阶段信息 —— 淘汰赛 event 从来不带 `Stage N`
 *
 * 两条互补：`star` 能区分同名 event，赛事名能兼容 `star` 缺失的情况。
 */
export function isPlayoffMatch(
  match: Pick<ScheduleMatch, 'eventName' | 'eventNameZh' | 'star'>,
): boolean {
  if (match.star === PLAYOFF_STAR) return true
  return !stageOfName(match.eventNameZh) && !stageOfName(match.eventName)
}

/** 从赛事名里取阶段名（`第一阶段` / `Stage 2`），取不到返回 null */
function stageOfName(name: string | null | undefined): string | null {
  const stage = name?.match(STAGE_PATTERN)
  if (!stage) return null
  return stage[1] ? `第${stage[1]}阶段` : `Stage ${stage[2]}`
}

/**
 * 展示用阶段名，如「PGL新加坡Major第一阶段-2026」→「第一阶段」。
 *
 * 英文名和中文名都试一遍，谁先带阶段信息用谁；都不带就是决胜阶段。
 */
export function shortEventName(
  match: Pick<ScheduleMatch, 'eventName' | 'eventNameZh' | 'star'>,
): string {
  return stageOfName(match.eventNameZh) ?? stageOfName(match.eventName) ?? '决胜阶段'
}
