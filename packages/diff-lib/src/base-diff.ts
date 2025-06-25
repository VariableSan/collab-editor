import { DiffResult, DiffCalculator } from './types'

export abstract class BaseDiffCalculator implements DiffCalculator {
  abstract calculate(oldText: string, newText: string): DiffResult

  apply(text: string, diff: DiffResult): string {
    let result = ''
    let position = 0

    for (const op of diff.operations) {
      switch (op.type) {
        case 'retain':
          result += text.substring(position, position + op.value.length)
          position += op.value.length
          break
        case 'insert':
          result += op.value
          break
        case 'delete':
          position += op.value.length
          break
      }
    }

    return result
  }

  protected createChecksum(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString(36)
  }
}
