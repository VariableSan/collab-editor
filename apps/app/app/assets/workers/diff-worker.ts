import { MyersDiffCalculator, SharedTextBuffer } from 'diff-lib'
import { WorkerEventType } from '~/types'

const calculator = new MyersDiffCalculator()
let currentBuffer: SharedTextBuffer | null = null
let prevBuffer: SharedTextBuffer | null = null

self.addEventListener('message', (event: MessageEvent) => {
  const { type } = event.data

  switch (type) {
    case WorkerEventType.InitSharedBuffer: {
      const {
        currentBuffer: currBuf,
        prevBuffer: prevBuf,
        maxLength,
      } = event.data

      try {
        currentBuffer = SharedTextBuffer.fromSharedData(
          {
            buffer: currBuf,
            textLength: new Int32Array(currBuf, maxLength * 2, 3),
            lockArray: new Int32Array(currBuf, maxLength * 2 + 12, 1),
          },
          maxLength,
        )

        prevBuffer = SharedTextBuffer.fromSharedData(
          {
            buffer: prevBuf,
            textLength: new Int32Array(prevBuf, maxLength * 2, 3),
            lockArray: new Int32Array(prevBuf, maxLength * 2 + 12, 1),
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
      if (!currentBuffer || !prevBuffer) {
        console.error('SharedArrayBuffer not initialized')
        break
      }

      try {
        const oldText = prevBuffer.getText()
        const newText = currentBuffer.getText()

        const result = calculator.calculate(oldText, newText)

        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result,
        })
      } catch (error) {
        console.error('Error calculating diff:', error)
        const err = error as Error
        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result: { operations: [] },
          error: err.message,
        })
      }
      break
    }

    case WorkerEventType.ApplyDiffFromBuffer: {
      if (!currentBuffer || !prevBuffer) {
        console.error('SharedArrayBuffer not initialized')
        break
      }

      const { diff } = event.data

      try {
        const text = currentBuffer.getText()
        const result = calculator.apply(text, diff)

        currentBuffer.setText(result)
        prevBuffer.setText(result)

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

    case WorkerEventType.CalculateDiff: {
      const { oldText, newText } = event.data

      try {
        const result = calculator.calculate(oldText, newText)

        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result,
        })
      } catch (error) {
        console.error('Error calculating diff:', error)
        const err = error as Error
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
