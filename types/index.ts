/**
 * 全局类型定义
 *
 * 命名约定：
 * - `MajorStageType`：大阶段（stage-1 / stage-2 / stage-3 / playoffs）
 * - `PlayoffStageType`：决胜阶段的三轮（8-to-4 / 4-to-2 / 2-to-1）
 * - `TaskStageType`：可独立评分的竞猜任务（三个瑞士轮 + 三轮淘汰赛）
 */

/* -------------------------------------------------------------------------- */
/*                                  阶段                                      */
/* -------------------------------------------------------------------------- */

/** 瑞士轮阶段 */
export type SwissStageType = 'stage-1' | 'stage-2' | 'stage-3'

/** 大阶段 */
export type MajorStageType = SwissStageType | 'playoffs'

/** 决胜阶段轮次 */
export type PlayoffStageType = '8-to-4' | '4-to-2' | '2-to-1'

/** 可独立评分的竞猜任务 */
export type TaskStageType = SwissStageType | PlayoffStageType

/** 阶段大类 */
export type StageType = 'swiss' | 'playoffs'

/** 阶段进度状态 */
export type StageProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'waiting'

/* -------------------------------------------------------------------------- */
/*                                  赛事                                      */
/* -------------------------------------------------------------------------- */

/** 参赛战队（含起始组别） */
export interface Team {
  id: string
  stage: SwissStageType
}

/** 战队静态资料 */
export interface TeamInfo {
  id: string
  name: string
  shortName?: string
  logo?: string
  link?: string
}

/** 瑞士轮战绩分组：进行中（1-0 … 2-2）与最终（3-0 … 0-3） */
export interface SwissResult {
  '1-0': string[]
  '0-1': string[]
  '1-1': string[]
  '2-0': string[]
  '0-2': string[]
  '2-1': string[]
  '1-2': string[]
  '2-2': string[]

  '3-0': string[]
  '3-1': string[]
  '3-2': string[]
  '2-3': string[]
  '1-3': string[]
  '0-3': string[]
}

/** 瑞士轮阶段 */
export interface SwissStage {
  name: string
  teams: string[]
  /** 上一阶段晋级的队伍（第二阶段起） */
  teamsFromAdvanced?: string[]
  result: SwissResult
  /**
   * 已结束的对局明细（可选）。
   *
   * `result` 只记「哪个战绩组里有谁」，不含具体对阵；只有它时推演页只能反推出
   * 能确定的场次，其余按默认剧本补。想精确显示「谁打谁」，在这里补上真实对阵即可。
   *
   * 只写「谁赢了谁」就行：轮次、配对、战绩都能从比赛顺序推出来，不用重复记。
   * 按比赛先后排列，同一轮的场次放一起。
   *
   * @example
   * // 第 1 轮
   * ['NIP', 'M80'],
   * ['PV', 'DENDELE'],
   * // → 写作 ['NIP', 'M80'] 表示 NIP 赢了 M80
   */
  matches?: SwissMatch[]
}

/** 决胜阶段单轮结果 */
export interface PlayoffsRoundResult {
  winners: string[]
  losers: string[]
}

/** 决赛结果 */
export interface PlayoffChampionshipResult {
  winner: string | null
  loser: string | null
}

/** 决胜阶段完整结果 */
export interface PlayoffsResult {
  '8-to-4': PlayoffsRoundResult
  '4-to-2': PlayoffsRoundResult
  '2-to-1': PlayoffChampionshipResult
}

/** 决胜阶段 */
export interface PlayoffsStage {
  teams: string[]
  result: PlayoffsResult
}

/** 赛事 */
export interface MajorEvent {
  id: string
  name: string
  shortName: string
  /** 赛程所在时区（IANA），用于按天分组，如 Asia/Shanghai */
  timezone?: string
  teams: Team[]
  /** 当前阶段（仅用于默认跳转） */
  current: MajorStageType
  'stage-1': SwissStage
  'stage-2': SwissStage
  'stage-3': SwissStage
  playoffs: PlayoffsStage
}

/* -------------------------------------------------------------------------- */
/*                                  赛程                                      */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                  赛程                                      */
/* -------------------------------------------------------------------------- */

/**
 * 瑞士轮的一场已结束对局：`[胜者, 败者]`。
 *
 * 就两个队伍 id，别的一概不记：
 * - **轮次**：按比赛顺序数——一轮 8 场，第 9 场就是第 2 轮；
 * - **配对**：就是这两支队；
 * - **战绩**：赢的 +1 胜、输的 +1 负，累加即得。
 *
 * 所以只需要记两条信息：谁赢了，谁输了。
 *
 * @example
 * ['NIP', 'M80'] // NIP 赢了 M80
 */
export type SwissMatch = [winner: string, loser: string]

/** 对局赛制：bo1 / bo3 / bo5 */
export type MatchFormat = 'bo1' | 'bo3' | 'bo5'

/** 对局状态：未开始 / 进行中 / 已结束 */
export type MatchStatus = 'upcoming' | 'live' | 'finished'

/** 赛程中的一场对局（推演页使用的本地赛程，赛程页已改为请求官方接口） */
export interface Match {
  /** 对局唯一 id，形如 stage-1-r1-m1 */
  id: string
  /** 开始时间（ISO 8601，带时区偏移） */
  start: string
  /** 对局编号（1 起），用于对应瑞士轮轮次表中的 Match N */
  no?: number
  /** 瑞士轮轮次（1 ~ 5），决胜阶段不使用 */
  round?: number
  /** 开赛时的战绩组，如 0-0 / 1-0 / 2-2；`null` 表示待定（尚未分组） */
  group?: string | null
  format: MatchFormat
  /** null 表示队伍待定（TBD） */
  teamA: string | null
  teamB: string | null
  /** 最终比分；null 表示未结束 */
  score?: [number, number] | null
  /** 胜者 id */
  winner?: string | null
  /** 关联的赛事方比赛 id（便于回查原数据） */
  sourceMatchId?: number
}

/**
 * 赛程页上的一场对局。
 *
 * 数据来自赛事方接口（`lib/schedule/api.ts`），与 `data/events.json` 无关，
 * 队伍用队名而不是队伍 id，队标通过 `lib/schedule/teams.ts` 映射到本地资源。
 */
export interface ScheduleMatch {
  /** 赛事方对局 id */
  id: number
  /** 开赛时间（毫秒时间戳） */
  start: number
  /** 队名；null 表示待定 */
  teamA: string | null
  teamB: string | null
  /** 最终比分；null 表示未结束 */
  score: [number, number] | null
  /** 胜者队名；未结束或待定为 null */
  winner: string | null
  format: MatchFormat
  status: MatchStatus
  /** 赛事名，如 PGL Singapore Major 2026 Stage 1 */
  eventName: string
  /** 赛事中文名 */
  eventNameZh: string
  /**
   * 赛事方给该场次的「重要度」。实测：瑞士轮（含第三阶段）为 1，决胜阶段为 2。
   * 决胜阶段的赛事名与主赛事同名、不带阶段信息，靠它才分得出来。
   */
  star: number | null
}

/** 推演结果中的队伍 */
export interface SimulationTeam {
  id: string
  /** 推演得到的总战绩 3-0 / 3-1 / 3-2 / 2-3 / 1-3 / 0-3 */
  record: SwissResultRecord
}

/** 单次瑞士轮推演结果 */
export interface SwissSimulation {
  stageId: SwissStageType
  /** 按 3-0 → 0-3 分组的队伍 */
  groups: Record<SwissResultRecord, SimulationTeam[]>
  /** 每个对局编号对应的战绩组（用于展示轮次表） */
  rounds: { round: number; group: string }[]
}

/* -------------------------------------------------------------------------- */
/*                                  竞猜                                      */
/* -------------------------------------------------------------------------- */

export type SwissPredictionBucket = '3-0' | '3-X' | '0-3'
export type SwissProgressRecord = '1-0' | '0-1' | '1-1' | '2-0' | '0-2' | '2-1' | '1-2' | '2-2'
export type SwissResultRecord = '3-0' | '3-1' | '3-2' | '2-3' | '1-3' | '0-3'

/** 瑞士轮竞猜：2 支 3-0、6 支 3-X、2 支 0-3 */
export interface StagePrediction {
  '3-0': string[]
  '3-X': string[]
  '0-3': string[]
}

/** 决胜阶段竞猜：4 支四强、2 支决赛、1 支冠军 */
export interface PlayoffsPrediction {
  '8-to-4': string[]
  '4-to-2': string[]
  '2-to-1': string | null
}

/** 竞猜者资料（data/predictors.json） */
export interface Predictor {
  id: string
  name: string
  platform: string
  link?: string
  avatar?: string
}

/** 竞猜者的完整竞猜数据（data/predictions/*.json） */
export interface PredictorPrediction extends Predictor {
  'stage-1'?: StagePrediction
  'stage-2'?: StagePrediction
  'stage-3'?: StagePrediction
  playoffs?: PlayoffsPrediction
}

/** 单个赛事的竞猜文件 */
export interface EventPredictions {
  id: string
  predictions: PredictorPrediction[]
}

/* -------------------------------------------------------------------------- */
/*                                  评分                                      */
/* -------------------------------------------------------------------------- */

/** 队伍在某次竞猜下的判定结果 */
export type TeamOutcome = 'win' | 'lose' | 'pending'

/** 单个竞猜任务的通过状态 */
export interface StagePassStatus {
  stageId: TaskStageType
  /** true 通过 / false 未通过 / null 未决出 */
  passed: boolean | null
  totalCount: number
  requiredCount: number
  correctCount: number
  /** 已确定错误的预测数（进行中时用于展示） */
  impossibleCount: number
  /** 该阶段的实际结果是否已完整 */
  isActualResultComplete: boolean
}

/** 竞猜者总览统计 */
export interface PredictorStats extends Predictor {
  totalPassed: number
  totalStages: number
  totalCorrect: number
  totalPredictions: number
  stageResults: StagePassStatus[]
}

/** 大阶段进度 */
export interface StageProgress {
  stageId: MajorStageType
  stageName: string
  status: StageProgressStatus
  hasResults: boolean
  isResultsComplete: boolean
}

/** 赛事整体进度 */
export interface EventProgress {
  /** 当前进行中的大阶段，赛事未开始或已结束时为 null */
  currentStage: MajorStageType | null
  completedStages: MajorStageType[]
  stages: StageProgress[]
  hasResults: boolean
  isCompleted: boolean
}

/** 页面展示用的阶段视图（决胜阶段已拆成三轮） */
export interface StageView {
  id: TaskStageType
  kind: StageType
  status: StageProgressStatus
  hasResults: boolean
  hasPredictions: boolean
  /** 是否应在页面上展示 */
  visible: boolean
}
