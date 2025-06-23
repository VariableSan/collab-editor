import { WSClientOptions } from './types'
import { CollaborativeWSClient } from './ws-client'

export interface BrowserWSClientOptions extends WSClientOptions {
  workerProvider?: Worker
}

export class BrowserCollaborativeClient extends CollaborativeWSClient {
  private workerProvider?: Worker

  constructor(options: BrowserWSClientOptions) {
    super(options)

    if (options.workerProvider) {
      this.initializeWorker(options.workerProvider)
    }
  }

  private initializeWorker(workerProvider: Worker): void {
    try {
      this.workerProvider = workerProvider

      this.workerProvider.addEventListener('message', event => {
        if (event.data.type === 'diff-result') {
          this.sendTextChange(event.data.newText)
        }
      })
    } catch (error) {
      console.warn('Failed to initialize worker:', error)
    }
  }

  sendTextChange(newText: string): void {
    if (this.workerProvider) {
      this.workerProvider.postMessage({
        type: 'calculate-diff',
        oldText: this.getCurrentText(),
        newText,
      })
    } else {
      super.sendTextChange(newText)
    }
  }

  disconnect(): void {
    if (this.workerProvider) {
      this.workerProvider.terminate()
      this.workerProvider = undefined
    }
    super.disconnect()
  }
}
