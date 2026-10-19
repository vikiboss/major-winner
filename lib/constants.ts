/**
 * 阶段相关的静态配置。
 *
 * 页面上的阶段名称、角标、副标题、分组名全部来自这里，
 * 新增/调整阶段只需要改这一个文件。
 */

import type {
  MajorStageType,
  PlayoffStageType,
  StageType,
  SwissPredictionBucket,
  SwissProgressRecord,
  SwissResultRecord,
  SwissStageType,
  TaskStageType,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*                                  阶段列表                                   */
/* -------------------------------------------------------------------------- */

export const SWISS_STAGES: SwissStageType[] = ['stage-1', 'stage-2', 'stage-3']
export const PLAYOFF_ROUNDS: PlayoffStageType[] = ['8-to-4', '4-to-2', '2-to-1']
export const MAJOR_STAGES: MajorStageType[] = [...SWISS_STAGES, 'playoffs']
export const TASK_STAGES: TaskStageType[] = [...SWISS_STAGES, ...PLAYOFF_ROUNDS]

/* -------------------------------------------------------------------------- */
/*                              瑞士轮战绩分组                                 */
/* -------------------------------------------------------------------------- */

// prettier-ignore
export const SWISS_PROGRESS_RECORDS: SwissProgressRecord[] = ['1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2']

export const SWISS_RESULT_WIN_RECORDS: SwissResultRecord[] = ['3-0', '3-1', '3-2']
export const SWISS_RESULT_LOSE_RECORDS: SwissResultRecord[] = ['2-3', '1-3', '0-3']
export const SWISS_RESULT_RECORDS: SwissResultRecord[] = [
  ...SWISS_RESULT_WIN_RECORDS,
  ...SWISS_RESULT_LOSE_RECORDS,
]

/** 瑞士轮阶段完整结果的数量要求 */
export const SWISS_RESULT_SIZE: Record<SwissResultRecord, number> = {
  '3-0': 2,
  '3-1': 3,
  '3-2': 3,
  '2-3': 3,
  '1-3': 3,
  '0-3': 2,
}

/** 展示顺序：进行中按胜场从多到少 */
export const SWISS_PROGRESS_DISPLAY_ORDER: SwissProgressRecord[] = [
  '2-2',
  '2-1',
  '2-0',
  '1-2',
  '1-1',
  '1-0',
  '0-2',
  '0-1',
]

/* -------------------------------------------------------------------------- */
/*                              竞猜分组规则                                   */
/* -------------------------------------------------------------------------- */

/** 瑞士轮三个竞猜分组及其对应的「猜对」战绩 */
export const SWISS_BUCKET_MATCH: Record<SwissPredictionBucket, SwissResultRecord[]> = {
  '3-0': ['3-0'],
  '3-X': ['3-1', '3-2'],
  '0-3': ['0-3'],
}

export const SWISS_BUCKETS: SwissPredictionBucket[] = ['3-0', '3-X', '0-3']

/** 各竞猜任务的通过规则：答对 required 个即通过 */
export const PASS_RULE: Record<TaskStageType, { total: number; required: number }> = {
  'stage-1': { total: 10, required: 5 },
  'stage-2': { total: 10, required: 5 },
  'stage-3': { total: 10, required: 5 },
  '8-to-4': { total: 4, required: 2 },
  '4-to-2': { total: 2, required: 1 },
  '2-to-1': { total: 1, required: 1 },
}

/* -------------------------------------------------------------------------- */
/*                                阶段元数据                                   */
/* -------------------------------------------------------------------------- */

export interface StageMeta {
  id: TaskStageType
  /** 所属大阶段 */
  parent: MajorStageType
  kind: StageType
  /** 完整名称 */
  label: string
  /** 表格/窄屏用的短名 */
  shortLabel: string
  /** 标题前的角标 */
  badge: string
  /** 标题下的副标题 */
  subtitle: string
  /** 瑞士轮分组名 */
  groupName?: string
}

export const STAGE_META: Record<TaskStageType, StageMeta> = {
  'stage-1': {
    id: 'stage-1',
    parent: 'stage-1',
    kind: 'swiss',
    label: '第一阶段',
    shortLabel: '第一阶段',
    badge: 'S1',
    subtitle: '瑞士轮 · 三败淘汰',
    groupName: '🧗‍♂️ 挑战组',
  },
  'stage-2': {
    id: 'stage-2',
    parent: 'stage-2',
    kind: 'swiss',
    label: '第二阶段',
    shortLabel: '第二阶段',
    badge: 'S2',
    subtitle: '瑞士轮 · 三败淘汰',
    groupName: '🌟 传奇组',
  },
  'stage-3': {
    id: 'stage-3',
    parent: 'stage-3',
    kind: 'swiss',
    label: '第三阶段',
    shortLabel: '第三阶段',
    badge: 'S3',
    subtitle: '瑞士轮 · 三败淘汰',
    groupName: '👑 冠军组',
  },
  '8-to-4': {
    id: '8-to-4',
    parent: 'playoffs',
    kind: 'playoffs',
    label: '八进四',
    shortLabel: '四强',
    badge: 'F1',
    subtitle: '决胜阶段 · 八进四',
  },
  '4-to-2': {
    id: '4-to-2',
    parent: 'playoffs',
    kind: 'playoffs',
    label: '半决赛',
    shortLabel: '二强',
    badge: 'F2',
    subtitle: '决胜阶段 · 四进二',
  },
  '2-to-1': {
    id: '2-to-1',
    parent: 'playoffs',
    kind: 'playoffs',
    label: '决赛',
    shortLabel: '冠军',
    badge: 'F3',
    subtitle: '决赛 · 冠军争夺',
  },
}

/** 大阶段展示名 */
export const MAJOR_STAGE_LABEL: Record<MajorStageType, string> = {
  'stage-1': '第一阶段',
  'stage-2': '第二阶段',
  'stage-3': '第三阶段',
  playoffs: '决胜阶段',
}

/** 大阶段对应的竞猜分组标签 */
export const GROUP_LABEL: Record<TaskStageType, string> = {
  'stage-1': '3-0',
  'stage-2': '3-0',
  'stage-3': '3-0',
  '8-to-4': '四强',
  '4-to-2': '二强',
  '2-to-1': '冠军',
}

/* -------------------------------------------------------------------------- */
/*                                  其它                                       */
/* -------------------------------------------------------------------------- */

/** 「比赛结果」这一条竞猜记录的 id，展示排行时需排除 */
export const RESULT_PREDICTOR_ID = 'cs'

export const SITE = {
  name: 'Major Winner',
  url: 'https://major.viki.moe',
  logo: 'https://image.viki.moe/cs/image/icon.png',
  teamLogo: (id: string) => `https://image.viki.moe/cs/t/${id}.png`,
  github: 'https://github.com/vikiboss/major-winner',
  qqGroup: 'https://qm.qq.com/q/oiHxyHNfl6',
} as const

/* -------------------------------------------------------------------------- */
/*                                  查询                                       */
/* -------------------------------------------------------------------------- */

export function getStageMeta(stageId: TaskStageType): StageMeta {
  return STAGE_META[stageId]
}

export function isSwissStage(stageId: string): stageId is SwissStageType {
  return (SWISS_STAGES as string[]).includes(stageId)
}

export function isPlayoffRound(stageId: string): stageId is PlayoffStageType {
  return (PLAYOFF_ROUNDS as string[]).includes(stageId)
}

export function isMajorStage(stageId: string): stageId is MajorStageType {
  return (MAJOR_STAGES as string[]).includes(stageId)
}

/** 大阶段 → 其下所有可评分任务 */
export function getStageTasks(stageId: MajorStageType): TaskStageType[] {
  return stageId === 'playoffs' ? [...PLAYOFF_ROUNDS] : [stageId]
}
