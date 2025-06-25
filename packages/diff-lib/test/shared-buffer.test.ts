import { beforeEach, describe, expect, it } from 'vitest'
import { SharedTextBuffer } from '../src/shared-buffer'

describe('SharedTextBuffer', () => {
  let buffer: SharedTextBuffer

  beforeEach(() => {
    buffer = new SharedTextBuffer({
      maxLength: 1000,
      encoding: 'utf-16',
    })
  })

  it('should initialize with empty text', () => {
    expect(buffer.getText()).toBe('')
    expect(buffer.getVersion()).toBe(0)
  })

  it('should set and get text correctly', () => {
    const testText = 'Hello, World!'
    buffer.setText(testText)

    expect(buffer.getText()).toBe(testText)
    expect(buffer.getVersion()).toBe(1)
  })

  it('should increment version on each setText', () => {
    buffer.setText('First')
    expect(buffer.getVersion()).toBe(1)

    buffer.setText('Second')
    expect(buffer.getVersion()).toBe(2)

    buffer.setText('Third')
    expect(buffer.getVersion()).toBe(3)
  })

  it('should handle unicode characters', () => {
    const unicodeText = '🚀 Hello 世界 🌍'
    buffer.setText(unicodeText)

    expect(buffer.getText()).toBe(unicodeText)
  })

  it('should truncate text that exceeds maxLength', () => {
    const smallBuffer = new SharedTextBuffer({
      maxLength: 10,
      encoding: 'utf-16',
    })

    const longText = 'This is a very long text that exceeds the buffer size'
    smallBuffer.setText(longText)

    expect(smallBuffer.getText().length).toBeLessThanOrEqual(10)
  })

  it('should handle concurrent access with Atomics', () => {
    // This test simulates concurrent access patterns
    const iterations = 100
    let lastVersion = 0

    for (let i = 0; i < iterations; i++) {
      buffer.setText(`Text ${i}`)
      const version = buffer.getVersion()

      // Version should always increase
      expect(version).toBeGreaterThan(lastVersion)
      lastVersion = version
    }

    expect(buffer.getVersion()).toBe(iterations)
  })

  it('should create and restore from shared data', () => {
    const originalText = 'Shared data test'
    buffer.setText(originalText)

    const sharedData = buffer.getSharedData()
    const restoredBuffer = SharedTextBuffer.fromSharedData(sharedData, 1000)

    expect(restoredBuffer.getText()).toBe(originalText)
    expect(restoredBuffer.getVersion()).toBe(1)
  })

  it('should handle empty text correctly', () => {
    buffer.setText('Some text')
    expect(buffer.getText()).toBe('Some text')

    buffer.setText('')
    expect(buffer.getText()).toBe('')
    expect(buffer.getVersion()).toBe(2)
  })

  it('should maintain text integrity through multiple operations', () => {
    const operations = [
      'First line',
      'First line\nSecond line',
      'Modified first line\nSecond line',
      'Modified first line\nSecond line\nThird line',
      '',
    ]

    operations.forEach((text, index) => {
      buffer.setText(text)
      expect(buffer.getText()).toBe(text)
      expect(buffer.getVersion()).toBe(index + 1)
    })
  })
})
