import { MyersDiffCalculator, type DiffResult } from 'diff-lib'
import { WorkerEventType } from '~/types'

const calculator = new MyersDiffCalculator()

self.addEventListener('message', (event: MessageEvent) => {
  const workerType: WorkerEventType = event.data.type

  if (workerType === WorkerEventType.CalculateDiff) {
    const { oldText, newText } = event.data as {
      oldText: string
      newText: string
    }
    const result = calculator.calculate(oldText, newText)

    self.postMessage({
      type: WorkerEventType.CalculateDiffResult,
      result,
    })
  }

  if (workerType === WorkerEventType.ApplyDiff) {
    const { text, diff } = event.data as {
      text: string
      diff: DiffResult
    }
    const result = calculator.apply(text, diff)

    self.postMessage({
      type: WorkerEventType.ApplyDiffResult,
      result,
    })
  }
})
