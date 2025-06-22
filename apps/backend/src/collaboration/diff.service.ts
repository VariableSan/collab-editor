import { Injectable } from '@nestjs/common'
import { BaseDiffCalculator, DiffResult, MyersDiffCalculator } from 'diff-lib'

@Injectable()
export class DiffService {
  private diffCalculator: BaseDiffCalculator

  constructor() {
    this.diffCalculator = new MyersDiffCalculator()
  }

  calculateDiff(oldText: string, newText: string) {
    return this.diffCalculator.calculate(oldText, newText)
  }

  applyDiff(text: string, diff: DiffResult): string {
    return this.diffCalculator.apply(text, diff)
  }

  verifyChecksum(text: string, checksum: string): boolean {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString(36) === checksum
  }
}
