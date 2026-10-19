/**
 * 原始数据装载层。
 *
 * 只负责把 JSON 变成内存对象和索引，不做任何业务计算。
 * 新增赛事时需要动的地方：`data/events.json`、`data/predictions/<event-id>.json`，
 * 以及下面 predictions 的 import 列表。
 */

import eventsData from '@/data/events.json' with { type: 'json' }
import predictorsData from '@/data/predictors.json' with { type: 'json' }
import teamsData from '@/data/teams.json' with { type: 'json' }

import budapest2025 from '@/data/predictions/2025-budapest.json' with { type: 'json' }
import cologne2026 from '@/data/predictions/2026-cologne.json' with { type: 'json' }

import type { EventPredictions, MajorEvent, Predictor, TeamInfo } from '@/types'

export const events = eventsData as MajorEvent[]
export const predictors = predictorsData as Predictor[]
export const teams = teamsData as TeamInfo[]

export const predictionFiles = [budapest2025, cologne2026] as EventPredictions[]

export const teamMap: Map<string, TeamInfo> = new Map(teams.map((t) => [t.id, t]))
export const predictorMap: Map<string, Predictor> = new Map(predictors.map((p) => [p.id, p]))
export const eventMap: Map<string, MajorEvent> = new Map(events.map((e) => [e.id, e]))

/** 默认赛事（首页重定向用） */
export const firstEvent = events[0] as MajorEvent

/** 侧边栏/选择器用的赛事摘要 */
export const eventSummaries = events.map(({ id, name, shortName }) => ({ id, name, shortName }))
