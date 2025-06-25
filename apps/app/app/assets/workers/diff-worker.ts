import { MyersDiffCalculator, SharedTextBuffer } from 'diff-lib'
import { WorkerEventType } from '~/types'

const calculator = new MyersDiffCalculator()
let sharedBuffer: SharedTextBuffer | null = null
let lastKnownText = ''
let lastKnownVersion = 0
let maxLength = 65536

// Handle messages from main thread
self.addEventListener('message', (event: MessageEvent) => {
  const workerType: WorkerEventType = event.data.type

  switch (workerType) {
    case WorkerEventType.InitSharedBuffer: {
      const { buffer, textLength, lockArray, config } = event.data
      maxLength = config.maxLength

      // Reconstruct SharedTextBuffer from transferred data
      sharedBuffer = SharedTextBuffer.fromSharedData(
        { buffer, textLength, lockArray },
        maxLength,
      )

      // Initialize with current text
      lastKnownText = sharedBuffer.getText()
      lastKnownVersion = sharedBuffer.getVersion()

      // Start monitoring for changes
      startMonitoring()

      self.postMessage({
        type: WorkerEventType.SharedBufferInitialized,
      })
      break
    }

    case WorkerEventType.CalculateDiff: {
      if (!sharedBuffer) {
        // Fallback to direct diff calculation
        const { oldText, newText } = event.data
        const result = calculator.calculate(oldText, newText)

        self.postMessage({
          type: WorkerEventType.CalculateDiffResult,
          result,
        })
      } else {
        // Use SharedArrayBuffer
        const currentText = sharedBuffer.getText()
        const currentVersion = sharedBuffer.getVersion()

        if (currentText !== lastKnownText) {
          const result = calculator.calculate(lastKnownText, currentText)
          lastKnownText = currentText
          lastKnownVersion = currentVersion

          self.postMessage({
            type: WorkerEventType.CalculateDiffResult,
            result,
            version: currentVersion,
          })
        }
      }
      break
    }

    case WorkerEventType.ApplyDiff: {
      const { diff } = event.data

      if (sharedBuffer) {
        const currentText = sharedBuffer.getText()
        const result = calculator.apply(currentText, diff)
        sharedBuffer.setText(result)
        sharedBuffer.notifyChange()
        lastKnownText = result
        lastKnownVersion = sharedBuffer.getVersion()
      } else {
        // Fallback
        const { text } = event.data
        const result = calculator.apply(text, diff)

        self.postMessage({
          type: WorkerEventType.ApplyDiffResult,
          result,
        })
      }
      break
    }

    case WorkerEventType.SetText: {
      const { text } = event.data

      if (sharedBuffer) {
        sharedBuffer.setText(text)
        sharedBuffer.notifyChange()
        lastKnownText = text
        lastKnownVersion = sharedBuffer.getVersion()
      }
      break
    }
  }
})

// Monitor SharedArrayBuffer for changes
function startMonitoring() {
  if (!sharedBuffer) return

  // Use Atomics.wait in a loop
  const monitor = () => {
    if (!sharedBuffer) return

    const changed = sharedBuffer.waitForChange(100) // 100ms timeout

    if (changed) {
      const currentText = sharedBuffer.getText()
      const currentVersion = sharedBuffer.getVersion()

      if (currentVersion > lastKnownVersion && currentText !== lastKnownText) {
        const result = calculator.calculate(lastKnownText, currentText)
        lastKnownText = currentText
        lastKnownVersion = currentVersion

        self.postMessage({
          type: WorkerEventType.SharedBufferChanged,
          result,
          version: currentVersion,
        })
      }
    }

    // Continue monitoring
    setTimeout(monitor, 0)
  }

  monitor()
}
