import { describe, expect, it } from 'vitest'

import {
  GROUP_LABEL,
  MAJOR_STAGES,
  MAJOR_STAGE_LABEL,
  PASS_RULE,
  PLAYOFF_ROUNDS,
  RESULT_PREDICTOR_ID,
  STAGE_META,
  SWISS_BUCKET_MATCH,
  SWISS_BUCKETS,
  SWISS_PROGRESS_DISPLAY_ORDER,
  SWISS_RESULT_RECORDS,
  SWISS_RESULT_SIZE,
  SWISS_STAGES,
  TASK_STAGES,
  getStageMeta,
  getStageTasks,
  isMajorStage,
  isPlayoffRound,
  isSwissStage,
} from '@/lib/constants'

describe('阶段元数据', () => {
  it('每个可评分任务都有元数据', () => {
    for (const stageId of TASK_STAGES) {
      const meta = STAGE_META[stageId]
      expect(meta, stageId).toBeDefined()
      expect(meta.id).toBe(stageId)
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.badge.length).toBeGreaterThan(0)
      expect(meta.subtitle.length).toBeGreaterThan(0)
    }
  })

  it('瑞士轮阶段有分组名，决胜轮次没有', () => {
    for (const stageId of SWISS_STAGES) {
      expect(STAGE_META[stageId].groupName).toBeTruthy()
      expect(STAGE_META[stageId].kind).toBe('swiss')
    }
    for (const round of PLAYOFF_ROUNDS) {
      expect(STAGE_META[round].groupName).toBeUndefined()
      expect(STAGE_META[round].kind).toBe('playoffs')
      expect(STAGE_META[round].parent).toBe('playoffs')
    }
  })

  it('大阶段标签齐全', () => {
    for (const stageId of MAJOR_STAGES) {
      expect(MAJOR_STAGE_LABEL[stageId]).toBeTruthy()
    }
  })

  it('竞猜分组标签', () => {
    expect(GROUP_LABEL['8-to-4']).toBe('四强')
    expect(GROUP_LABEL['4-to-2']).toBe('二强')
    expect(GROUP_LABEL['2-to-1']).toBe('冠军')
  })

  it('getStageMeta 与 getStageTasks', () => {
    expect(getStageMeta('stage-2').label).toBe('第二阶段')
    expect(getStageTasks('playoffs')).toEqual(['8-to-4', '4-to-2', '2-to-1'])
    expect(getStageTasks('stage-1')).toEqual(['stage-1'])
  })
})

describe('阶段判定', () => {
  it('isSwissStage', () => {
    expect(isSwissStage('stage-1')).toBe(true)
    expect(isSwissStage('8-to-4')).toBe(false)
    expect(isSwissStage('playoffs')).toBe(false)
  })

  it('isPlayoffRound', () => {
    expect(isPlayoffRound('8-to-4')).toBe(true)
    expect(isPlayoffRound('2-to-1')).toBe(true)
    expect(isPlayoffRound('stage-3')).toBe(false)
  })

  it('isMajorStage', () => {
    expect(isMajorStage('stage-2')).toBe(true)
    expect(isMajorStage('playoffs')).toBe(true)
    expect(isMajorStage('4-to-2')).toBe(false)
  })
})

describe('竞猜规则常量', () => {
  it('瑞士轮三个分组', () => {
    expect(SWISS_BUCKETS).toEqual(['3-0', '3-X', '0-3'])
  })

  it('分组对应的正确战绩', () => {
    expect(SWISS_BUCKET_MATCH['3-0']).toEqual(['3-0'])
    expect(SWISS_BUCKET_MATCH['3-X']).toEqual(['3-1', '3-2'])
    expect(SWISS_BUCKET_MATCH['0-3']).toEqual(['0-3'])
  })

  it('通过规则：瑞士轮 5/10，八进四 2/4，半决赛 1/2，决赛 1/1', () => {
    expect(PASS_RULE['stage-1']).toEqual({ total: 10, required: 5 })
    expect(PASS_RULE['8-to-4']).toEqual({ total: 4, required: 2 })
    expect(PASS_RULE['4-to-2']).toEqual({ total: 2, required: 1 })
    expect(PASS_RULE['2-to-1']).toEqual({ total: 1, required: 1 })
  })

  it('完整瑞士轮需要 16 支队伍', () => {
    const total = SWISS_RESULT_RECORDS.reduce((sum, record) => sum + SWISS_RESULT_SIZE[record], 0)
    expect(total).toBe(16)
  })

  it('进行中战绩展示顺序覆盖全部 8 种', () => {
    expect(new Set(SWISS_PROGRESS_DISPLAY_ORDER).size).toBe(8)
  })

  it('「比赛结果」基准记录的 id 固定', () => {
    expect(RESULT_PREDICTOR_ID).toBe('cs')
  })
})
