import { describe, expect, it } from 'vitest'
import { DiffAlgorithm } from '../src/diff'

describe('DiffAlgorithm', () => {
  let diffAlgorithm: DiffAlgorithm

  beforeEach(() => {
    diffAlgorithm = new DiffAlgorithm()
  })

  describe('simpleDiff', () => {
    it('should find equal strings', () => {
      expect(diffAlgorithm.simpleDiff('abc', 'abc')).toEqual([
        { type: 'equal', value: 'abc' },
      ])
    })
    it('should handle insertion', () => {
      expect(diffAlgorithm.simpleDiff('abc', 'abcd')).toEqual([
        { type: 'equal', value: 'abc' },
        { type: 'insert', value: 'd' },
      ])
    })
    it('should handle deletion', () => {
      expect(diffAlgorithm.simpleDiff('abcd', 'abc')).toEqual([
        { type: 'equal', value: 'abc' },
        { type: 'delete', value: 'd' },
      ])
    })
  })

  describe('charwiseDiff', () => {
    it('should find equal strings', () => {
      expect(diffAlgorithm.charwiseDiff('abc', 'abc')).toEqual([
        { type: 'equal', value: 'abc' },
      ])
    })
    it('should handle insertion', () => {
      expect(diffAlgorithm.charwiseDiff('abc', 'abcd')).toEqual([
        { type: 'equal', value: 'abc' },
        { type: 'insert', value: 'd' },
      ])
    })
    it('should handle deletion', () => {
      expect(diffAlgorithm.charwiseDiff('abcd', 'abc')).toEqual([
        { type: 'equal', value: 'abc' },
        { type: 'delete', value: 'd' },
      ])
    })
    it('should handle change in middle', () => {
      expect(diffAlgorithm.charwiseDiff('abc', 'axc')).toEqual([
        { type: 'equal', value: 'a' },
        { type: 'delete', value: 'b' },
        { type: 'insert', value: 'x' },
        { type: 'equal', value: 'c' },
      ])
    })
  })
})
