import type {
  MajorStageType,
  PlayoffStageType,
  SwissProgressRecord,
  SwissResultRecord,
  SwissStageType,
} from '@/types'

export const STAGE_TYPE = {
  SWISS: 'swiss',
  PLAYOFFS: 'playoffs',
} as const

export const SWISS_STAGES: SwissStageType[] = ['stage-1', 'stage-2', 'stage-3']
export const MAJOR_STAGES: MajorStageType[] = [...SWISS_STAGES, 'playoffs']
export const PLAYOFFS_STAGES: PlayoffStageType[] = ['8-to-4', '4-to-2', '2-to-1']

export const STAGE_GROUP_NAME_MAP = {
  'stage-1': '🧗‍♂️ 挑战组',
  'stage-2': '🌟 传奇组',
  'stage-3': '👑 冠军组',
}

// prettier-ignore
export const SWISS_PROGRESS_RECORDS: SwissProgressRecord[] = ['1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2']

export const SWISS_RESULT_WIN_RECORDS: SwissResultRecord[] = ['3-0', '3-1', '3-2']
export const SWISS_RESULT_LOSE_RECORDS: SwissResultRecord[] = ['2-3', '1-3', '0-3']

export const SWISS_RESULT_RECORDS: SwissResultRecord[] = [
  ...SWISS_RESULT_WIN_RECORDS,
  ...SWISS_RESULT_LOSE_RECORDS,
]

export const STAGE_NAME_MAP: Record<MajorStageType | PlayoffStageType, string> = {
  'stage-1': '第一阶段',
  'stage-2': '第二阶段',
  'stage-3': '第三阶段',
  playoffs: '决胜阶段',

  '8-to-4': '八进四',
  '4-to-2': '半决赛',
  '2-to-1': '决赛',
}
