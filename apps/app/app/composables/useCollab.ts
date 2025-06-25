import { SharedTextBuffer } from 'diff-lib'
import { CollaborativeWSClient } from 'ws-client'
import DiffWorker from '~/assets/workers/diff-worker?worker'
import { WorkerEventType } from '~/types'

const DELAY_MS = 300
const MAX_TEXT_LENGTH = 65536

export const useCollab = () => {
  let wsClient: CollaborativeWSClient | null = null
  let diffWorker: Worker | null = null
  let sharedBuffer: SharedTextBuffer | null = null

  const textarea = ref('')
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let isRemoteUpdate = false
  let isInitialized = false

  const initSharedBuffer = () => {
    try {
      sharedBuffer = new SharedTextBuffer({
        maxLength: MAX_TEXT_LENGTH,
        encoding: 'utf-16',
      })

      // Transfer SharedArrayBuffer to worker
      const sharedData = sharedBuffer.getSharedData()
      diffWorker?.postMessage({
        type: WorkerEventType.InitSharedBuffer,
        buffer: sharedData.buffer,
        textLength: sharedData.textLength,
        lockArray: sharedData.lockArray,
        config: {
          maxLength: MAX_TEXT_LENGTH,
        },
      })
    } catch (err) {
      console.error('Failed to initialize SharedArrayBuffer:', err)
      error.value =
        'SharedArrayBuffer not supported. Falling back to regular mode.'
    }
  }

  const sendTextChange = (newText: string) => {
    if (!isInitialized) return

    if (sharedBuffer) {
      // Update SharedArrayBuffer
      sharedBuffer.setText(newText)
      sharedBuffer.notifyChange()

      // Trigger diff calculation in worker
      diffWorker?.postMessage({
        type: WorkerEventType.CalculateDiff,
      })
    } else {
      // Fallback to regular diff calculation
      diffWorker?.postMessage({
        type: WorkerEventType.CalculateDiff,
        oldText: wsClient?.getCurrentText() || '',
        newText: newText,
      })
    }
  }

  const sendTextChangeDebounced = useDebounceFn(sendTextChange, DELAY_MS)

  const initWsClient = () => {
    wsClient = new CollaborativeWSClient({
      url: `ws://${window.location.hostname}:4000`,
      namespace: '/collaborate',
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    })

    wsClient.on('connect', () => {
      isConnected.value = true
      error.value = null
      console.log('Connected to collaboration server')
    })

    wsClient.on('disconnect', reason => {
      isConnected.value = false
      console.log('Disconnected:', reason)
    })

    wsClient.on('error', err => {
      error.value = err.message
      console.error('WebSocket error:', err)
    })

    wsClient.on('diffReceived', diff => {
      console.log('Received diff from server')
      isRemoteUpdate = true

      // Apply diff in worker
      diffWorker?.postMessage({
        type: WorkerEventType.ApplyDiff,
        diff,
      })
    })

    wsClient.on('textChange', newText => {
      // Fallback for full text sync (e.g., initial connection)
      console.log('Received full text update')
      isRemoteUpdate = true
      textarea.value = newText

      if (sharedBuffer) {
        sharedBuffer.setText(newText)
        sharedBuffer.notifyChange()
      }

      // Update worker's known text
      diffWorker?.postMessage({
        type: WorkerEventType.SetText,
        text: newText,
      })

      nextTick(() => {
        isRemoteUpdate = false
      })
    })

    wsClient.connect()
  }

  const initDiffWorker = () => {
    diffWorker = new DiffWorker()

    diffWorker.addEventListener('message', e => {
      switch (e.data.type) {
        case WorkerEventType.SharedBufferInitialized: {
          isInitialized = true
          console.log('SharedArrayBuffer initialized in worker')
          break
        }

        case WorkerEventType.CalculateDiffResult: {
          const { result } = e.data

          if (!isRemoteUpdate && wsClient && isConnected.value) {
            wsClient.sendDiff(result)
          }
          break
        }

        case WorkerEventType.ApplyDiffResult: {
          const { result } = e.data
          textarea.value = result
          nextTick(() => {
            isRemoteUpdate = false
          })
          break
        }

        case WorkerEventType.SharedBufferChanged: {
          // Handle changes detected by worker monitoring
          const { result } = e.data

          if (!isRemoteUpdate && wsClient && isConnected.value) {
            wsClient.sendDiff(result)
          }

          // Update textarea to reflect SharedArrayBuffer content
          if (sharedBuffer) {
            const currentText = sharedBuffer.getText()
            if (currentText !== textarea.value && !isRemoteUpdate) {
              textarea.value = currentText
            }
          }
          break
        }
      }
    })

    // Initialize SharedArrayBuffer after worker is ready
    nextTick(() => {
      initSharedBuffer()
    })
  }

  onMounted(() => {
    initDiffWorker()
    initWsClient()
  })

  onBeforeUnmount(() => {
    wsClient?.disconnect()
    diffWorker?.terminate()
  })

  watch(textarea, newValue => {
    if (!isRemoteUpdate && isInitialized) {
      sendTextChangeDebounced(newValue)
    }
  })

  return {
    textarea,
    isConnected,
    error,
  }
}
