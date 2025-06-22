import { MyersDiffCalculator } from 'diff-lib'

const calculator = new MyersDiffCalculator()

self.addEventListener('message', (event: MessageEvent) => {
  if (event.data.type === 'calculate-diff') {
    try {
      const { oldText, newText } = event.data
      const result = calculator.calculate(oldText, newText)

      self.postMessage({
        type: 'diff-result',
        result,
      })
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
})
