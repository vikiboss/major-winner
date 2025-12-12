// 阶段 ID 类型
export type SwissStageType = 'stage-1' | 'stage-2' | 'stage-3'

// Major 竞猜类型
export type MajorStageType = SwissStageType | 'playoffs'

// 决赛轮次类型
export type PlayoffStageType = '8-to-4' | '4-to-2' | '2-to-1'

// 任务阶段类型
export type TaskStageType = Exclude<MajorStageType, 'playoffs'> | PlayoffStageType

export type StageType = 'swiss' | 'playoffs'

// 战队信息(包含所属阶段)
export interface Team {
  name: string
  shortName: string
  stage: SwissStageType
  link: string
}

// 瑞士轮结果(包含最终结果和进行中的战绩)
export interface SwissResult {
  // 进行中的战绩(比赛进行时填充这些字段)
  '1-0': string[]
  '0-1': string[]
  '1-1': string[]
  '2-0': string[]
  '0-2': string[]
  '2-1': string[]
  '1-2': string[]
  '2-2': string[]

  // 最终结果(比赛结束后填充这些字段)
  '3-0': string[]
  '3-1': string[]
  '3-2': string[]
  '2-3': string[]
  '1-3': string[]
  '0-3': string[]
}

// 阶段信息(瑞士轮)
export interface SwissStage {
  name: string
  teams: string[]
  // 第二、三阶段有晋级队伍,第一阶段没有
  teamsFromAdvanced?: string[]
  result: SwissResult
}

// 决胜阶段单轮结果
export interface PlayoffsRoundResult {
  winners: string[]
  losers: string[]
}

// 决赛总决赛结果(冠军赛)
export interface PlayoffChampionshipResult {
  winner: string | null
  loser: string | null
}

// 决胜阶段完整结果
export interface PlayoffsResult {
  '8-to-4': PlayoffsRoundResult
  '4-to-2': PlayoffsRoundResult
  '2-to-1': PlayoffChampionshipResult
}

// 决胜阶段
export interface PlayoffsStage {
  teams: string[]
  result: PlayoffsResult
}

// 赛事信息
export interface MajorEvent {
  id: string
  name: string
  teams: Team[]
  'stage-1': SwissStage
  'stage-2': SwissStage
  'stage-3': SwissStage
  playoffs: PlayoffsStage
}

export type SwissPredictionBucket = '3-0' | '3-1-or-3-2' | '0-3'
export type SwissProgressRecord = '1-0' | '0-1' | '1-1' | '2-0' | '0-2' | '2-1' | '1-2' | '2-2'
export type SwissResultRecord = '3-0' | '3-1' | '3-2' | '2-3' | '1-3' | '0-3'

// 竞猜数据 - 瑞士轮阶段(竞猜者只竞猜 3-0 / 3-1-or-3-2 / 0-3)
export interface StagePrediction {
  '3-0': string[] // 2 支队伍
  '3-1-or-3-2': string[] // 6 支队伍
  '0-3': string[] // 2 支队伍
}

// 竞猜数据 - 决胜阶段
export interface PlayoffsPrediction {
  '8-to-4': string[] // 4 支队伍(四强)
  '4-to-2': string[] // 2 支队伍(决赛)
  '2-to-1': string | null // 1 支队伍(冠军)或 null
}

// 单个竞猜者数据
export interface PredictorPrediction {
  id: string
  name: string
  platform: string
  link?: string
  'stage-1'?: StagePrediction
  'stage-2'?: StagePrediction
  'stage-3'?: StagePrediction
  playoffs?: PlayoffsPrediction
}

// 赛事竞猜数据
export interface EventPredictions {
  id: string
  predictions: PredictorPrediction[]
}

// 阶段通过状态
export interface StagePassStatus {
  stageId: TaskStageType
  passed: boolean | null // 是否通过该阶段
  totalCount: number // 总竞猜数
  correctCount: number // 正确预测数
  requiredCount: number // 通过所需的正确预测数
  impossibleCount: number // 已经确定错误的预测数（进行中时有用）
  details: string
  isActualResultComplete: boolean // 阶段结果是否完整(完整才能判断通过/未通过)
}

// 计算统计用类型
export interface PredictorStats {
  id: string
  name: string
  platform: string
  link?: string

  totalPassed: number // 通过的阶段数
  totalStages: number // 总阶段数

  totalCorrect: number // 总正确数
  totalPredictions: number // 总竞猜数

  stageResults: StagePassStatus[]
}

// 赛事状态枚举
export enum EventStatus {
  NOT_STARTED = 'not_started', // 未开始
  STAGE_1 = 'stage_1', // 第一阶段进行中
  STAGE_1_COMPLETED = 'stage_1_completed', // 第一阶段已完成
  STAGE_2 = 'stage_2', // 第二阶段进行中
  STAGE_2_COMPLETED = 'stage_2_completed', // 第二阶段已完成
  STAGE_3 = 'stage_3', // 第三阶段进行中
  STAGE_3_COMPLETED = 'stage_3_completed', // 第三阶段已完成
  playoffS_8_TO_4 = 'playoffs_8_to_4', // 八进四进行中
  playoffS_8_TO_4_COMPLETED = 'playoffs_8_to_4_completed', // 八进四已完成
  playoffS_4_TO_2 = 'playoffs_4_to_2', // 半决赛进行中
  playoffS_4_TO_2_COMPLETED = 'playoffs_4_to_2_completed', // 半决赛已完成
  playoffS_2_TO_1 = 'playoffs_2_to_1', // 决赛进行中
  COMPLETED = 'completed', // 赛事已完成
}

// 阶段进度信息
export interface StageProgress {
  stageId: MajorStageType
  stageName: string
  status: 'not_started' | 'in_progress' | 'completed'
  hasResults: boolean
  isResultsComplete: boolean
}

// 赛事整体进度信息
export interface EventProgress {
  eventStatus: EventStatus
  currentStage: MajorStageType | null
  completedStages: MajorStageType[]
  stagesProgress: StageProgress[]
}
