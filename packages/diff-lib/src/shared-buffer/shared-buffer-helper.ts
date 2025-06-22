import { SharedBufferConfig, SharedBufferData } from '../types'

export class SharedBufferHelper {
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()

  createSharedBuffer(config: SharedBufferConfig): SharedBufferData {
    const buffer = new SharedArrayBuffer(config.maxLength)
    const textLength = new Int32Array(new SharedArrayBuffer(4))
    const lockArray = new Int32Array(new SharedArrayBuffer(4))

    return {
      buffer,
      textLength,
      lockArray,
    }
  }

  writeText(data: SharedBufferData, text: string): void {
    const encoded = this.encoder.encode(text)
    const view = new Uint8Array(data.buffer)

    Atomics.store(data.lockArray, 0, 1)

    view.set(encoded)
    Atomics.store(data.textLength, 0, encoded.length)

    Atomics.store(data.lockArray, 0, 0)
    Atomics.notify(data.lockArray, 0)
  }

  readText(data: SharedBufferData): string {
    Atomics.wait(data.lockArray, 0, 1)

    const length = Atomics.load(data.textLength, 0)
    const view = new Uint8Array(data.buffer, 0, length)

    return this.decoder.decode(view)
  }
}
