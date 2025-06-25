import { MyersDiffCalculator, SharedTextBuffer } from 'diff-lib'
import { WorkerEventType } from '~/types'

const calculator = new MyersDiffCalculator()
let sharedBuffer: SharedTextBuffer | null = null

self.addEventListener('message', (event: MessageEvent) => {
  const { type } = event.data

  switch (type) {
    case WorkerEventType.InitSharedBuffer: {
      const { buffer, maxLength } = event.data

      try {
        sharedBuffer = SharedTextBuffer.fromSharedData(
          {
            buffer,
            textLength: new Int32Array(buffer, maxLength * 2, 3),
            lockArray: new Int32Array(buffer, maxLength * 2 + 12, 1),
          },
          maxLength,
        )

        self.postMessage({
          type: WorkerEventType.SharedBufferReady,
        })
      } catch (error) {
        console.error('Failed to init SharedArrayBuffer in worker:', error)
      }
      break
    }

    case WorkerEventType.CalculateDiffFromBuffer: {
      if (!sharedBuffer) {
        console.error('SharedArrayBuffer not initialized')
        break
      }

      const { oldText } = event.data
      const newText = sharedBuffer.getText()

      try {
        const result = calculator.calculate(oldText, newText)

        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result,
        })
      } catch (error) {
        const err = error as Error
        console.error('Error calculating diff:', error)
        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result: { operations: [] },
          error: err.message,
        })
      }
      break
    }

    case WorkerEventType.CalculateDiff: {
      const { oldText, newText } = event.data

      try {
        const result = calculator.calculate(oldText, newText)

        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result,
        })
      } catch (error) {
        const err = error as Error
        console.error('Error calculating diff:', error)
        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result: { operations: [] },
          error: err.message,
        })
      }
      break
    }

    case WorkerEventType.ApplyDiff: {
      const { text, diff } = event.data

      try {
        const result = calculator.apply(text, diff)

        self.postMessage({
          type: WorkerEventType.ApplyDiffResult,
          result,
        })
      } catch (error) {
        const err = error as Error
        console.error('Error applying diff:', error)
        self.postMessage({
          type: WorkerEventType.ApplyDiffResult,
          error: err.message,
        })
      }
      break
    }
  }
})
