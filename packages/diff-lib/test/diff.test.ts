import { describe, expect, it } from 'vitest'
import { charwiseDiff, simpleDiff } from '../src/diff'

describe('simpleDiff', () => {
  it('should find equal strings', () => {
    expect(simpleDiff('abc', 'abc')).toEqual([{ type: 'equal', value: 'abc' }])
  })
  it('should handle insertion', () => {
    expect(simpleDiff('abc', 'abcd')).toEqual([
      { type: 'equal', value: 'abc' },
      { type: 'insert', value: 'd' },
    ])
  })
  it('should handle deletion', () => {
    expect(simpleDiff('abcd', 'abc')).toEqual([
      { type: 'equal', value: 'abc' },
      { type: 'delete', value: 'd' },
    ])
  })
})

describe('charwiseDiff', () => {
  it('should find equal strings', () => {
    expect(charwiseDiff('abc', 'abc')).toEqual([
      { type: 'equal', value: 'abc' },
    ])
  })
  it('should handle insertion', () => {
    expect(charwiseDiff('abc', 'abcd')).toEqual([
      { type: 'equal', value: 'abc' },
      { type: 'insert', value: 'd' },
    ])
  })
  it('should handle deletion', () => {
    expect(charwiseDiff('abcd', 'abc')).toEqual([
      { type: 'equal', value: 'abc' },
      { type: 'delete', value: 'd' },
    ])
  })
  it('should handle change in middle', () => {
    expect(charwiseDiff('abc', 'axc')).toEqual([
      { type: 'equal', value: 'a' },
      { type: 'delete', value: 'b' },
      { type: 'insert', value: 'x' },
      { type: 'equal', value: 'c' },
    ])
  })
})
