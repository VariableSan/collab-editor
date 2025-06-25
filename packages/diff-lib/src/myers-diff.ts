import { DiffOperation, DiffResult } from './types'
import { BaseDiffCalculator } from './base-diff'

export class MyersDiffCalculator extends BaseDiffCalculator {
  calculate(oldText: string, newText: string): DiffResult {
    const operations: DiffOperation[] = []

    if (oldText === newText) {
      if (oldText.length > 0) {
        operations.push({
          type: 'retain',
          value: oldText,
        })
      }
      return { operations }
    }

    let commonPrefixLength = 0
    const minLength = Math.min(oldText.length, newText.length)

    while (
      commonPrefixLength < minLength &&
      oldText[commonPrefixLength] === newText[commonPrefixLength]
    ) {
      commonPrefixLength++
    }

    let commonSuffixLength = 0
    let oldEnd = oldText.length - 1
    let newEnd = newText.length - 1

    while (
      oldEnd > commonPrefixLength &&
      newEnd > commonPrefixLength &&
      oldText[oldEnd] === newText[newEnd]
    ) {
      commonSuffixLength++
      oldEnd--
      newEnd--
    }

    if (commonPrefixLength > 0) {
      operations.push({
        type: 'retain',
        value: oldText.substring(0, commonPrefixLength),
      })
    }

    const oldMiddle = oldText.substring(commonPrefixLength, oldEnd + 1)
    const newMiddle = newText.substring(commonPrefixLength, newEnd + 1)

    if (oldMiddle.length > 0) {
      operations.push({
        type: 'delete',
        value: oldMiddle,
      })
    }

    if (newMiddle.length > 0) {
      operations.push({
        type: 'insert',
        value: newMiddle,
      })
    }

    if (commonSuffixLength > 0) {
      operations.push({
        type: 'retain',
        value: oldText.substring(oldEnd + 1),
      })
    }

    return {
      operations,
      checksum: this.createChecksum(newText),
    }
  }
}
