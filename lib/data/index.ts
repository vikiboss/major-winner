/**
 * 数据层统一出口。
 *
 * 页面请统一从 `@/lib/data` 引入，不要直接引用子模块。
 */

/* 原始数据与索引 */
export { events, teams, teamMap, predictorMap, eventMap, firstEvent, eventSummaries } from './store'

/* 赛事与阶段进度 */
export {
  hasEvent,
  getEvent,
  getStageProgress,
  getEventProgress,
  getCurrentStage,
  getRoundProgress,
} from './progress'

/* 评分 */
export {
  isSwissResultComplete,
  hasSwissResults,
  isPlayoffRoundComplete,
  getSwissTeamOutcome,
  getPlayoffTeamOutcome,
  isTeamEliminated,
  scoreSwissPrediction,
  hasPredictionForStage,
  evaluateStage,
  evaluatePredictor,
} from './scoring'

/* 竞猜查询与视图模型 */
export {
  getEventPredictions,
  hasPredictions,
  getStatsMap,
  getPredictorStats,
  getAllPredictorStats,
  createRows,
  buildRows,
  createStageViews,
  getPreviewRows,
  getStagePredictionCounts,
  getStageViews,
  getVisibleStages,
  countParticipants,
} from './predictions'

export type { PredictorRow, PredictionGroup, PredictionTeam } from './predictions'
