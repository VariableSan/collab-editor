import { beforeEach, describe, expect, it } from 'vitest'
import { DiffAlgorithm } from '../src/diff-algorithm'

describe('DiffAlgorithm', () => {
  let diff: DiffAlgorithm

  beforeEach(() => {
    diff = new DiffAlgorithm()
  })

  it('should return no operations for identical strings', () => {
    const oldText = 'hello world\nfoo bar'
    const newText = 'hello world\nfoo bar'
    const result = diff.calculateDiff(oldText, newText)
    expect(result.operations).toEqual([])
    expect(result.oldLength).toBe(oldText.length)
    expect(result.newLength).toBe(newText.length)
  })

  it('should detect inserted line', () => {
    const oldText = 'a\nb\nc'
    const newText = 'a\nb\nX\nc'
    const result = diff.calculateDiff(oldText, newText)
    expect(result.operations.some(op => op.type === 'insert')).toBe(true)
    const applied = diff.applyDiff(oldText, result.operations)
    expect(applied).toBe(newText)
  })

  it('should detect deleted line', () => {
    const oldText = 'a\nb\nc'
    const newText = 'a\nc'
    const result = diff.calculateDiff(oldText, newText)
    expect(result.operations.some(op => op.type === 'delete')).toBe(true)
    const applied = diff.applyDiff(oldText, result.operations)
    expect(applied).toBe(newText)
  })

  it('should handle completely different strings', () => {
    const oldText = 'foo\nbar'
    const newText = 'baz\nqux'
    const result = diff.calculateDiff(oldText, newText)
    expect(result.operations.some(op => op.type === 'delete')).toBe(true)
    expect(result.operations.some(op => op.type === 'insert')).toBe(true)
    const applied = diff.applyDiff(oldText, result.operations)
    expect(applied).toBe(newText)
  })

  it('should handle empty oldText', () => {
    const oldText = ''
    const newText = 'abc\ndef'
    const result = diff.calculateDiff(oldText, newText)
    expect(result.operations.every(op => op.type === 'insert')).toBe(true)
    const applied = diff.applyDiff(oldText, result.operations)
    expect(applied).toBe(newText)
  })

  it('should handle empty newText', () => {
    const oldText = 'abc\ndef'
    const newText = ''
    const result = diff.calculateDiff(oldText, newText)
    expect(result.operations.every(op => op.type === 'delete')).toBe(true)
    const applied = diff.applyDiff(oldText, result.operations)
    expect(applied).toBe(newText)
  })

  it('should throw on too large input', () => {
    const lines = Array(20000).fill('x').join('\n')
    expect(() => diff.calculateDiff(lines, lines)).toThrow(
      'Text too large for diff calculation',
    )
  })

  it('should throw on timeout', () => {
    // Artificially set a very low timeout
    diff = new DiffAlgorithm({ timeout: 0 })
    const oldText = 'a\n'.repeat(10000)
    const newText = 'a\n'.repeat(10000)
    expect(() => diff.calculateDiff(oldText, newText)).toThrow(
      'Diff calculation timeout',
    )
  })
})
