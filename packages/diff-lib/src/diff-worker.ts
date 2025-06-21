/// <reference lib="webworker" />

import { DiffAlgorithm } from './diff-algorithm'
import { WorkerMessage, WorkerResponse } from './types'

declare const self: DedicatedWorkerGlobalScope

let sharedBuffer: SharedArrayBuffer | null = null
let sharedData: Int32Array | null = null
let resultBuffer: SharedArrayBuffer | null = null
let errorBuffer: SharedArrayBuffer | null = null

const diffAlgorithm = new DiffAlgorithm()

function initializeSharedBuffers(
  mainBuffer: SharedArrayBuffer,
  resBuffer: SharedArrayBuffer,
  errBuffer: SharedArrayBuffer,
): void {
  sharedBuffer = mainBuffer
  sharedData = new Int32Array(sharedBuffer)
  resultBuffer = resBuffer
  errorBuffer = errBuffer
}

function setStatus(status: number): void {
  if (sharedData) {
    Atomics.store(sharedData, 0, status)
    Atomics.notify(sharedData, 0)
  }
}

function writeResult(result: string): void {
  if (resultBuffer && sharedData) {
    const encoder = new TextEncoder()
    const encoded = encoder.encode(result)
    const resultArray = new Uint8Array(resultBuffer)

    resultArray.set(encoded.slice(0, resultBuffer.byteLength))
    Atomics.store(
      sharedData,
      1,
      Math.min(encoded.length, resultBuffer.byteLength),
    )
  }
}

function writeError(error: string): void {
  if (errorBuffer && sharedData) {
    const encoder = new TextEncoder()
    const encoded = encoder.encode(error)
    const errorArray = new Uint8Array(errorBuffer)

    errorArray.set(encoded.slice(0, errorBuffer.byteLength))
    Atomics.store(
      sharedData,
      2,
      Math.min(encoded.length, errorBuffer.byteLength),
    )
  }
}

function handleDiffMessage(message: WorkerMessage): void {
  try {
    setStatus(1)

    if (message.payload && 'oldText' in message.payload) {
      const { oldText, newText, config } = message.payload

      if (config) {
        diffAlgorithm['timeout'] = config.timeout ?? 5000
        diffAlgorithm['maxLines'] = config.maxLines ?? 10000
      }

      const result = diffAlgorithm.calculateDiff(oldText, newText)
      const serialized = JSON.stringify(result)

      writeResult(serialized)
      setStatus(2)

      const response: WorkerResponse = {
        id: message.id,
        success: true,
        result,
      }
      self.postMessage(response)
    } else {
      throw new Error('Invalid diff payload')
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    writeError(errorMessage)
    setStatus(3)

    const response: WorkerResponse = {
      id: message.id,
      success: false,
      error: errorMessage,
    }
    self.postMessage(response)
  }
}

function handleApplyMessage(message: WorkerMessage): void {
  try {
    setStatus(1)

    if (
      message.payload &&
      'text' in message.payload &&
      'operations' in message.payload
    ) {
      const { text, operations } = message.payload
      const result = diffAlgorithm.applyDiff(text, operations)

      writeResult(result)
      setStatus(2)

      const response: WorkerResponse = {
        id: message.id,
        success: true,
        result,
      }
      self.postMessage(response)
    } else {
      throw new Error('Invalid apply payload')
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    writeError(errorMessage)
    setStatus(3)

    const response: WorkerResponse = {
      id: message.id,
      success: false,
      error: errorMessage,
    }
    self.postMessage(response)
  }
}

self.onmessage = (
  event: MessageEvent<
    | WorkerMessage
    | {
        type: 'init'
        buffers: [SharedArrayBuffer, SharedArrayBuffer, SharedArrayBuffer]
      }
  >,
) => {
  const { data } = event

  if ('type' in data && data.type === 'init' && 'buffers' in data) {
    const [mainBuffer, resBuffer, errBuffer] = data.buffers
    initializeSharedBuffers(mainBuffer, resBuffer, errBuffer)
    return
  }

  const message = data as WorkerMessage

  switch (message.type) {
    case 'diff':
      handleDiffMessage(message)
      break
    case 'apply':
      handleApplyMessage(message)
      break
    default:
      self.postMessage({
        id: message.id,
        success: false,
        error: 'Unknown message type',
      })
  }
}

self.onerror = error => {
  console.error('Worker error:', error)
  if (sharedData) {
    writeError(`Worker error: ${error.message}`)
    setStatus(3)
  }
}

export {}
