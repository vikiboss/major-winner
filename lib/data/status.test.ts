import { expect, test } from 'vitest'
import { getMatchStatus, winsNeeded } from '@/lib/data/swiss'

test('winsNeeded', () => {
  expect(winsNeeded('bo1')).toBe(1)
  expect(winsNeeded('bo3')).toBe(2)
  expect(winsNeeded('bo5')).toBe(3)
})

test('getMatchStatus', () => {
  expect(getMatchStatus('bo1', null)).toBe('upcoming')
  expect(getMatchStatus('bo1', [0, 0])).toBe('live')
  expect(getMatchStatus('bo1', [1, 0])).toBe('finished')
  expect(getMatchStatus('bo3', [1, 0])).toBe('live')
  expect(getMatchStatus('bo3', [1, 1])).toBe('live')
  expect(getMatchStatus('bo3', [2, 0])).toBe('finished')
  expect(getMatchStatus('bo3', [2, 1])).toBe('finished')
  expect(getMatchStatus('bo5', [2, 2])).toBe('live')
  expect(getMatchStatus('bo5', [3, 2])).toBe('finished')
})
