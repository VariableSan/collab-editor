import { describe, it, expect } from 'vitest'
import { MyersDiffCalculator } from '../src'

describe('MyersDiffCalculator', () => {
  const calculator = new MyersDiffCalculator()

  it('should handle identical texts', () => {
    const result = calculator.calculate('hello', 'hello')
    expect(result.operations).toHaveLength(1)
    expect(result.operations[0]).toEqual({
      type: 'retain',
      value: 'hello',
    })
  })

  it('should handle complete replacement', () => {
    const result = calculator.calculate('hello', 'world')
    expect(result.operations).toContainEqual({
      type: 'delete',
      value: 'hello',
    })
    expect(result.operations).toContainEqual({
      type: 'insert',
      value: 'world',
    })
  })

  it('should handle insertions', () => {
    const result = calculator.calculate('hello', 'hello world')
    expect(result.operations).toContainEqual({
      type: 'retain',
      value: 'hello',
    })
    expect(result.operations).toContainEqual({
      type: 'insert',
      value: ' world',
    })
  })

  it('should handle deletions', () => {
    const result = calculator.calculate('hello world', 'hello')
    expect(result.operations).toContainEqual({
      type: 'retain',
      value: 'hello',
    })
    expect(result.operations).toContainEqual({
      type: 'delete',
      value: ' world',
    })
  })

  it('should apply diff correctly', () => {
    const oldText = 'hello world'
    const newText = 'hello beautiful world'

    const diff = calculator.calculate(oldText, newText)
    const result = calculator.apply(oldText, diff)

    expect(result).toBe(newText)
  })
})
