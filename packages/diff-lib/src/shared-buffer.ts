import { SharedBufferConfig, SharedBufferData } from './types'

export class SharedTextBuffer {
  private buffer: SharedArrayBuffer
  private textArray: Uint16Array
  private metaArray: Int32Array
  private lockArray: Int32Array

  static readonly LOCK_INDEX = 0
  static readonly LENGTH_INDEX = 1
  static readonly VERSION_INDEX = 2
  static readonly META_SIZE = 3

  constructor(config: SharedBufferConfig) {
    const textBufferSize = config.maxLength * 2 // UTF-16
    const metaBufferSize = SharedTextBuffer.META_SIZE * 4 // Int32
    const lockBufferSize = 4 // Int32 for Atomics

    this.buffer = new SharedArrayBuffer(
      textBufferSize + metaBufferSize + lockBufferSize,
    )

    this.textArray = new Uint16Array(this.buffer, 0, config.maxLength)
    this.metaArray = new Int32Array(
      this.buffer,
      textBufferSize,
      SharedTextBuffer.META_SIZE,
    )
    this.lockArray = new Int32Array(
      this.buffer,
      textBufferSize + metaBufferSize,
      1,
    )

    // Initialize
    Atomics.store(this.metaArray, SharedTextBuffer.LENGTH_INDEX, 0)
    Atomics.store(this.metaArray, SharedTextBuffer.VERSION_INDEX, 0)
  }

  static fromSharedData(
    data: SharedBufferData,
    maxLength: number,
  ): SharedTextBuffer {
    const instance = Object.create(SharedTextBuffer.prototype)
    instance.buffer = data.buffer
    instance.textArray = new Uint16Array(data.buffer, 0, maxLength)
    instance.metaArray = new Int32Array(
      data.buffer,
      maxLength * 2,
      SharedTextBuffer.META_SIZE,
    )
    instance.lockArray = new Int32Array(
      data.buffer,
      maxLength * 2 + SharedTextBuffer.META_SIZE * 4,
      1,
    )
    return instance
  }

  getText(): string {
    const length = Atomics.load(this.metaArray, SharedTextBuffer.LENGTH_INDEX)
    const chars: number[] = []

    for (let i = 0; i < length; i++) {
      chars.push(this.textArray[i])
    }

    return String.fromCharCode(...chars)
  }

  setText(text: string): void {
    // Acquire lock
    while (Atomics.compareExchange(this.lockArray, 0, 0, 1) !== 0) {
      // Spin wait
    }

    try {
      const length = Math.min(text.length, this.textArray.length)

      for (let i = 0; i < length; i++) {
        this.textArray[i] = text.charCodeAt(i)
      }

      Atomics.store(this.metaArray, SharedTextBuffer.LENGTH_INDEX, length)
      Atomics.add(this.metaArray, SharedTextBuffer.VERSION_INDEX, 1)
    } finally {
      // Release lock
      Atomics.store(this.lockArray, 0, 0)
    }
  }

  getVersion(): number {
    return Atomics.load(this.metaArray, SharedTextBuffer.VERSION_INDEX)
  }

  waitForChange(timeout = 1000): boolean {
    const currentVersion = this.getVersion()
    const result = Atomics.wait(
      this.metaArray,
      SharedTextBuffer.VERSION_INDEX,
      currentVersion,
      timeout,
    )
    return result !== 'timed-out'
  }

  notifyChange(): void {
    Atomics.notify(this.metaArray, SharedTextBuffer.VERSION_INDEX)
  }

  getSharedData(): SharedBufferData {
    return {
      buffer: this.buffer,
      textLength: this.metaArray,
      lockArray: this.lockArray,
    }
  }
}
