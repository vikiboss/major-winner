/**
 * 浏览器端的瑞士轮推演。
 *
 * 复用 `swiss.ts` 的配对与赛制规则（Buchholz、首尾配对、重赛规避、BO1/BO3），
 * 只把「随机源」换成调用方传入的函数，方便每次点击重新推演。
 *
 * 单独放在这里的原因：React Compiler 会编译组件文件里的所有函数，
 * 把带有递增闭包状态的纯函数误判为 Hook，抽离后可以避免。
 */

import { formatRecord, getMatchFormat, isRecordDecided, parseRecord } from './swiss'

import type { MatchFormat, SwissResultRecord } from '@/types'

/** 一局推演出的对局 */
export interface SimulatedMatch {
  round: number
  group: string
  format: MatchFormat
  a: string
  b: string
  winner: string
}

/** 一次完整推演的结果 */
export interface SimulatedStage {
  groups: Record<SwissResultRecord, string[]>
  matches: SimulatedMatch[]
}

interface Standing {
  id: string
  buchholz: number
  seed: number
}

/**
 * 模拟一个 16 队瑞士轮阶段。
 *
 * @param teamIds 参赛队伍，顺序即初始种子（第一个是 1 号种子）
 * @param random 0~1 的随机源
 */
export function simulateStage(teamIds: string[], random: () => number): SimulatedStage {
  const records = new Map(teamIds.map((id) => [id, { wins: 0, losses: 0 }]))
  const seeds = new Map(teamIds.map((id, index) => [id, index + 1]))
  const history = new Map(teamIds.map((id) => [id, new Set<string>()]))

  const buchholz = (id: string) => {
    let sum = 0
    for (const opponent of history.get(id) ?? []) sum += records.get(opponent)?.wins ?? 0
    return sum
  }

  const matches: SimulatedMatch[] = []

  for (let round = 1; round <= 5; round++) {
    const active = teamIds.filter(
      (id) => !isRecordDecided(parseRecord(formatRecord(records.get(id)!))),
    )
    if (active.length < 2) break

    // 按战绩分组
    const byRecord = new Map<string, string[]>()
    for (const id of active) {
      const key = formatRecord(records.get(id)!)
      const list = byRecord.get(key) ?? []
      list.push(id)
      byRecord.set(key, list)
    }

    const orderedKeys = [...byRecord.keys()].toSorted((a, b) => {
      const ra = parseRecord(a)
      const rb = parseRecord(b)
      return rb.wins - ra.wins || ra.losses - rb.losses
    })

    for (const key of orderedKeys) {
      const group = byRecord.get(key)!

      // Buchholz 降序，同分按种子（小的在前）
      const standings: Standing[] = group
        .map((id) => ({ id, buchholz: buchholz(id), seed: seeds.get(id)! }))
        .toSorted((a, b) => b.buchholz - a.buchholz || a.seed - b.seed)

      const half = standings.length / 2
      const top = standings.slice(0, half).map((item) => item.id)
      const pool = standings
        .slice(half)
        .map((item) => item.id)
        .reverse()

      const format = getMatchFormat(records.get(standings[0].id)!)

      for (const team of top) {
        // 首尾配对 + 规避重赛
        const index = pool.findIndex((candidate) => !history.get(team)!.has(candidate))
        const opponent = pool.splice(index === -1 ? 0 : index, 1)[0]

        const winner = random() < 0.5 ? team : opponent
        const loser = winner === team ? opponent : team

        records.get(winner)!.wins++
        records.get(loser)!.losses++
        history.get(team)!.add(opponent)
        history.get(opponent)!.add(team)

        matches.push({ round, group: key, format, a: team, b: opponent, winner })
      }
    }
  }

  const groups: Record<SwissResultRecord, string[]> = {
    '3-0': [],
    '3-1': [],
    '3-2': [],
    '2-3': [],
    '1-3': [],
    '0-3': [],
  }

  for (const id of teamIds) {
    groups[formatRecord(records.get(id)!) as SwissResultRecord].push(id)
  }

  return { groups, matches }
}

/** mulberry32：简单可复现的伪随机源 */
export function seedRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
