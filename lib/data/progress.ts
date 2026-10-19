/**
 * 赛事/阶段进度判定：完全由 `data/events.json` 里的结果推导，不硬编码阶段。
 */

import { MAJOR_STAGE_LABEL, MAJOR_STAGES, PLAYOFF_ROUNDS } from '@/lib/constants'

import { hasSwissResults, isPlayoffRoundComplete, isSwissResultComplete } from './scoring'
import { eventMap, firstEvent } from './store'

import type {
  EventProgress,
  MajorEvent,
  MajorStageType,
  PlayoffStageType,
  PlayoffsStage,
  StageProgress,
  StageProgressStatus,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*                                 赛事查询                                    */
/* -------------------------------------------------------------------------- */

export function hasEvent(eventId: string): boolean {
  return eventMap.has(eventId)
}

/** 取赛事，找不到时回退到默认赛事 */
export function getEvent(eventId?: string): MajorEvent {
  return (eventId && eventMap.get(eventId)) || firstEvent
}

/* -------------------------------------------------------------------------- */
/*                                 阶段进度                                    */
/* -------------------------------------------------------------------------- */

export interface RoundProgress {
  hasResults: boolean
  isComplete: boolean
}

/** 决胜阶段某一轮的进度 */
export function getRoundProgress(
  playoffs: PlayoffsStage | undefined,
  round: PlayoffStageType,
): RoundProgress {
  if (!playoffs) return { hasResults: false, isComplete: false }

  const result = playoffs.result
  const hasResults =
    round === '2-to-1'
      ? !!result['2-to-1'].winner
      : result[round].winners.length > 0 || result[round].losers.length > 0

  return { hasResults, isComplete: isPlayoffRoundComplete(result, round) }
}

function toStatus(hasResults: boolean, isComplete: boolean): StageProgressStatus {
  return isComplete ? 'completed' : hasResults ? 'in_progress' : 'not_started'
}

/** 大阶段进度 */
export function getStageProgress(event: MajorEvent, stageId: MajorStageType): StageProgress {
  if (stageId === 'playoffs') {
    const rounds = PLAYOFF_ROUNDS.map((round) => getRoundProgress(event.playoffs, round))
    const hasResults = rounds.some((r) => r.hasResults)
    const isComplete = rounds.every((r) => r.isComplete)

    return {
      stageId,
      stageName: MAJOR_STAGE_LABEL[stageId],
      status: toStatus(hasResults, isComplete),
      hasResults,
      isResultsComplete: isComplete,
    }
  }

  const result = event[stageId].result
  const hasResults = hasSwissResults(result)
  const isComplete = isSwissResultComplete(result)

  return {
    stageId,
    stageName: MAJOR_STAGE_LABEL[stageId],
    status: toStatus(hasResults, isComplete),
    hasResults,
    isResultsComplete: isComplete,
  }
}

/** 赛事整体进度 */
export function getEventProgress(event: MajorEvent): EventProgress {
  const stages = MAJOR_STAGES.map((stageId) => getStageProgress(event, stageId))
  const completedStages = stages.filter((s) => s.status === 'completed').map((s) => s.stageId)
  const hasResults = stages.some((s) => s.hasResults)
  const isCompleted = completedStages.length === MAJOR_STAGES.length
  const currentStage = isCompleted
    ? null
    : (stages.find((s) => s.status !== 'completed')?.stageId ?? null)

  return { currentStage, completedStages, stages, hasResults, isCompleted }
}

/**
 * 用户最关心的阶段：第一个尚未完成的阶段，全部结束则返回决胜阶段。
 * 用于 `/stages` 的默认跳转。
 */
export function getCurrentStage(event: MajorEvent): MajorStageType {
  const { stages } = getEventProgress(event)
  return stages.find((s) => s.status !== 'completed')?.stageId ?? 'playoffs'
}
