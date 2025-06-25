import { Injectable } from '@nestjs/common'
import { DiffResult, MyersDiffCalculator } from 'diff-lib'

@Injectable()
export class DiffService {
  private diffCalculator: MyersDiffCalculator

  constructor() {
    this.diffCalculator = new MyersDiffCalculator()
  }

  calculateDiff(oldText: string, newText: string): DiffResult {
    return this.diffCalculator.calculate(oldText, newText)
  }

  applyDiff(text: string, diff: DiffResult): string {
    return this.diffCalculator.apply(text, diff)
  }

  validateDiff(diff: DiffResult): boolean {
    return (
      diff &&
      Array.isArray(diff.operations) &&
      diff.operations.every(
        op =>
          op.type &&
          ['insert', 'delete', 'retain'].includes(op.type) &&
          typeof op.text === 'string',
      )
    )
  }
}
