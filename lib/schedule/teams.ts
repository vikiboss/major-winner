/**
 * 赛事方队名 → 本地战队 id。
 *
 * 赛程页的数据来自接口，只带队名；队标用本项目的图片资源（`data/teams.json` 的 `logo`），
 * 以免依赖第三方 CDN，也避免跨域/防盗链导致的空白图。
 *
 * 匹配策略（依次尝试，全部忽略大小写与非字母数字）：
 * 1. `id`（如 `LVG`、`FaZe`）
 * 2. `shortName`（如 `Lynn Vision` → 简称）
 * 3. `name` 全称（如 `Lynn Vision Gaming`）
 * 4. 手工别名（接口与本地写法确实不同的，如 `PVISION` → `PV`）
 */

import { SITE } from '@/lib/constants'
import { teams } from '@/lib/data/store'

import type { TeamInfo } from '@/types'

/** 归一化：小写并去掉空格、点、连字符等，便于宽松匹配 */
function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * 接口写法与本地写法无法通过 id/shortName/name 命中的别名。
 * key 为归一化后的接口队名，value 为本地战队 id。
 */
const ALIASES: Record<string, string> = {
  pvision: 'PV', // 本地为 PARIVISION / PV
  parivision: 'PV',
  bcgame: 'BCG',
  bc: 'BCG',
  lynnvision: 'LVG', // 本地全称为 Lynn Vision Gaming，接口只写 Lynn Vision
}

/** 归一化队名 → 战队资料 */
const NAME_INDEX: Map<string, TeamInfo> = (() => {
  const index = new Map<string, TeamInfo>()

  for (const team of teams) {
    for (const candidate of [team.id, team.shortName, team.name]) {
      if (!candidate) continue
      const k = key(candidate)
      // 先写入的优先（id 在前，避免全称把简称覆盖成别的队）
      if (!index.has(k)) index.set(k, team)
    }
  }

  return index
})()

/** 找出队名对应的本地战队（找不到返回 undefined） */
export function findTeamByName(name: string | null | undefined): TeamInfo | undefined {
  if (!name) return undefined

  const k = key(name)
  if (!k) return undefined

  const direct = NAME_INDEX.get(k)
  if (direct) return direct

  const aliasId = ALIASES[k]
  if (aliasId) return teams.find((team) => team.id === aliasId)

  return undefined
}

/** 队名 → 本地队标地址；没有对应队伍时返回 null（由调用方回退成占位块） */
export function teamLogoByName(name: string | null | undefined): string | null {
  const team = findTeamByName(name)
  if (!team) return null
  return team.logo || SITE.teamLogo(team.id)
}

/**
 * 「队名 → 本地队标地址」映射，供客户端组件查表。
 *
 * 客户端不能 import `data/teams.json`（会进浏览器包），所以由服务端算好一张小表传下去。
 *
 * 注意：表的 key 必须覆盖**接口可能返回的各种写法**（`9z`、`NIP`、`Lynn Vision`…），
 * 而不只是本地的 `name` 全称，否则客户端拿接口队名查不到。
 * 因此这里把本地 id / shortName / name，以及别名反查出来的写法全部写入。
 */
export function buildTeamLogoMap(): Record<string, string> {
  const map: Record<string, string> = {}

  for (const team of teams) {
    const logo = team.logo || SITE.teamLogo(team.id)

    for (const candidate of [team.id, team.shortName, team.name]) {
      if (candidate) map[candidate] = logo
    }
  }

  // 别名（接口写法）反查后也指向同一张图
  for (const aliasId of new Set(Object.values(ALIASES))) {
    const team = teams.find((item) => item.id === aliasId)
    if (!team) continue

    const logo = team.logo || SITE.teamLogo(team.id)
    for (const [aliasKey, id] of Object.entries(ALIASES)) {
      if (id !== aliasId) continue
      // 别名 key 是归一化过的（无空格/点），客户端用的是原始队名，
      // 所以额外补一个归一化表供客户端 fallback。
      map[aliasKey] = logo
    }
  }

  return map
}

/**
 * 客户端查表：先按原始队名，再按归一化队名（兼容 `BC.G` / `bcg` 这类写法差异）。
 */
export function lookupTeamLogo(
  name: string | null | undefined,
  logos: Record<string, string>,
): string | null {
  if (!name) return null

  const direct = logos[name]
  if (direct) return direct

  const k = key(name)
  const normalized = logos[k]
  if (normalized) return normalized

  // 再扫一遍，容忍别名表中归一化过的键
  for (const [candidate, logo] of Object.entries(logos)) {
    if (key(candidate) === k) return logo
  }

  return null
}

/** 队名 → 展示用名称（优先本地简称，找不到就用接口原名） */
export function displayName(name: string | null | undefined): string | null {
  if (!name) return null
  const team = findTeamByName(name)
  return team?.shortName || team?.id || name
}
