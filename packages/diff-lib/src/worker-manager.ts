import {
  DiffConfig,
  DiffOperation,
  DiffResult,
  WorkerMessage,
  WorkerResponse,
} from './types'

export class WorkerManager {
  private worker: Worker | null = null
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  >()

  private sharedBuffer: SharedArrayBuffer | null = null
  private sharedData: Int32Array | null = null
  private resultBuffer: SharedArrayBuffer | null = null
  private errorBuffer: SharedArrayBuffer | null = null

  private supportsSharedArrayBuffer: boolean
  private defaultTimeout = 10000

  constructor() {
    this.supportsSharedArrayBuffer =
      typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined'
    this.initializeWorker()
  }

  private initializeWorker(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported')
      return
    }

    try {
      // @ts-ignore
      this.worker = new Worker(new URL('./diff-worker.js', import.meta.url), {
        type: 'module',
      })

      this.worker.onmessage = this.handleWorkerMessage.bind(this)
      this.worker.onerror = this.handleWorkerError.bind(this)

      if (this.supportsSharedArrayBuffer) {
        this.initializeSharedBuffers()
      }
    } catch (error) {
      console.error('Failed to initialize worker:', error)
    }
  }

  private initializeSharedBuffers(): void {
    try {
      this.sharedBuffer = new SharedArrayBuffer(12)
      this.sharedData = new Int32Array(this.sharedBuffer)

      this.resultBuffer = new SharedArrayBuffer(65536)

      this.errorBuffer = new SharedArrayBuffer(4096)

      Atomics.store(this.sharedData, 0, 0)
      Atomics.store(this.sharedData, 1, 0)
      Atomics.store(this.sharedData, 2, 0)

      if (this.worker) {
        this.worker.postMessage({
          type: 'init',
          buffers: [this.sharedBuffer, this.resultBuffer, this.errorBuffer],
        })
      }
    } catch (error) {
      console.warn('Failed to initialize SharedArrayBuffer:', error)
      this.supportsSharedArrayBuffer = false
    }
  }

  public async calculateDiff(
    oldText: string,
    newText: string,
    config?: DiffConfig,
  ): Promise<DiffResult> {
    if (!this.worker) {
      throw new Error('Worker not available')
    }

    const id = this.generateId()
    const message: WorkerMessage = {
      id,
      type: 'diff',
      payload: { oldText, newText, config },
    }

    if (this.supportsSharedArrayBuffer && this.sharedData) {
      return this.sendMessageWithSharedBuffer(message)
    } else {
      return this.sendMessageWithPostMessage(message)
    }
  }

  public async applyDiff(
    text: string,
    operations: DiffOperation[],
  ): Promise<string> {
    if (!this.worker) {
      throw new Error('Worker not available')
    }

    const id = this.generateId()
    const message: WorkerMessage = {
      id,
      type: 'apply',
      payload: { text, operations },
    }

    if (this.supportsSharedArrayBuffer && this.sharedData) {
      return this.sendMessageWithSharedBuffer(message)
    } else {
      return this.sendMessageWithPostMessage(message)
    }
  }

  private async sendMessageWithSharedBuffer(
    message: WorkerMessage,
  ): Promise<any> {
    if (
      !this.worker ||
      !this.sharedData ||
      !this.resultBuffer ||
      !this.errorBuffer
    ) {
      throw new Error('SharedArrayBuffer not initialized')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'))
      }, this.defaultTimeout)

      Atomics.store(this.sharedData!, 0, 0)

      this.worker!.postMessage(message)

      const waitForResult = () => {
        const status = Atomics.load(this.sharedData!, 0)

        if (status === 2) {
          clearTimeout(timeout)
          const resultLength = Atomics.load(this.sharedData!, 1)
          const resultArray = new Uint8Array(
            this.resultBuffer!,
            0,
            resultLength,
          )
          const decoder = new TextDecoder()
          const resultStr = decoder.decode(resultArray)

          try {
            const result = JSON.parse(resultStr)
            resolve(result)
          } catch {
            resolve(resultStr)
          }
        } else if (status === 3) {
          clearTimeout(timeout)
          const errorLength = Atomics.load(this.sharedData!, 2)
          const errorArray = new Uint8Array(this.errorBuffer!, 0, errorLength)
          const decoder = new TextDecoder()
          const errorStr = decoder.decode(errorArray)
          reject(new Error(errorStr))
        } else {
          setTimeout(waitForResult, 10)
        }
      }

      waitForResult()
    })
  }

  private sendMessageWithPostMessage(message: WorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id)
        reject(new Error('Worker timeout'))
      }, this.defaultTimeout)

      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout,
      })

      this.worker!.postMessage(message)
    })
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { data } = event
    const request = this.pendingRequests.get(data.id)

    if (request) {
      clearTimeout(request.timeout)
      this.pendingRequests.delete(data.id)

      if (data.success) {
        request.resolve(data.result)
      } else {
        request.reject(new Error(data.error || 'Worker error'))
      }
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error)

    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new Error(`Worker error: ${error.message}`))
    })
    this.pendingRequests.clear()
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new Error('Worker terminated'))
    })
    this.pendingRequests.clear()
  }
}
