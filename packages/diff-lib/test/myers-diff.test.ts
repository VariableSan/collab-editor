import { describe, expect, it } from 'vitest'
import { MyersDiffCalculator } from '../src/myers-diff'
import { SharedTextBuffer } from '../src/shared-buffer'

describe('MyersDiffCalculator with SharedTextBuffer', () => {
  const calculator = new MyersDiffCalculator()

  it('should calculate diff from buffer changes', () => {
    const buffer1 = new SharedTextBuffer({ maxLength: 1000 })
    const buffer2 = new SharedTextBuffer({ maxLength: 1000 })

    buffer1.setText('Hello World')
    buffer2.setText('Hello Beautiful World')

    const diff = calculator.calculate(buffer1.getText(), buffer2.getText())

    expect(diff.operations).toHaveLength(3)
    expect(diff.operations[0]).toEqual({ type: 'retain', value: 'Hello ' })
    expect(diff.operations[1]).toEqual({ type: 'insert', value: 'Beautiful ' })
    expect(diff.operations[2]).toEqual({ type: 'retain', value: 'World' })
  })

  it('should apply diff to buffer content', () => {
    const buffer = new SharedTextBuffer({ maxLength: 1000 })
    buffer.setText('Hello World')

    const diff = {
      operations: [
        { type: 'retain' as const, value: 'Hello ' },
        { type: 'insert' as const, value: 'Beautiful ' },
        { type: 'retain' as const, value: 'World' },
      ],
    }

    const result = calculator.apply(buffer.getText(), diff)
    expect(result).toBe('Hello Beautiful World')

    buffer.setText(result)
    expect(buffer.getText()).toBe('Hello Beautiful World')
    expect(buffer.getVersion()).toBe(2)
  })
})
