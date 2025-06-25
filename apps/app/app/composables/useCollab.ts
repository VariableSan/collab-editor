import { SharedTextBuffer } from 'diff-lib'
import type { DiffResult } from 'ws-client'
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
  const isSharedBufferEnabled = ref(false)

  let isRemoteUpdate = false
  let prevText = ''

  const initSharedBuffer = async () => {
    try {
      if (typeof SharedArrayBuffer === 'undefined') {
        console.log('SharedArrayBuffer not available, using regular mode')
        return false
      }

      sharedBuffer = new SharedTextBuffer({
        maxLength: MAX_TEXT_LENGTH,
        encoding: 'utf-16',
      })

      const sharedData = sharedBuffer.getSharedData()

      diffWorker?.postMessage({
        type: WorkerEventType.InitSharedBuffer,
        buffer: sharedData.buffer,
        maxLength: MAX_TEXT_LENGTH,
      })

      return new Promise<boolean>(resolve => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === WorkerEventType.SharedBufferReady) {
            diffWorker?.removeEventListener('message', handler)
            isSharedBufferEnabled.value = true
            console.log('SharedArrayBuffer initialized successfully')
            resolve(true)
          }
        }
        diffWorker?.addEventListener('message', handler)

        setTimeout(() => {
          diffWorker?.removeEventListener('message', handler)
          resolve(false)
        }, 1000)
      })
    } catch (err) {
      console.error('Failed to initialize SharedArrayBuffer:', err)
      return false
    }
  }

  const sendTextChange = (newText: string) => {
    if (isRemoteUpdate || !wsClient || !isConnected.value) return

    if (isSharedBufferEnabled.value && sharedBuffer) {
      sharedBuffer.setText(newText)

      diffWorker?.postMessage({
        type: WorkerEventType.CalculateDiffFromBuffer,
        oldText: prevText,
      })
    } else {
      diffWorker?.postMessage({
        type: WorkerEventType.CalculateDiff,
        oldText: prevText,
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

    wsClient.on('textChange', newText => {
      console.log('Received full text update')
      isRemoteUpdate = true
      textarea.value = newText
      prevText = newText

      if (isSharedBufferEnabled.value && sharedBuffer) {
        sharedBuffer.setText(newText)
      }

      nextTick(() => {
        isRemoteUpdate = false
      })
    })

    wsClient.on('diffReceived', (diff: DiffResult) => {
      console.log('Received diff from server')
      isRemoteUpdate = true

      diffWorker?.postMessage({
        type: WorkerEventType.ApplyDiff,
        text: textarea.value,
        diff,
      })
    })

    wsClient.connect()
  }

  const initDiffWorker = async () => {
    diffWorker = new DiffWorker()

    diffWorker.addEventListener('message', e => {
      switch (e.data.type) {
        case WorkerEventType.CalculateDiffResult: {
          const { result } = e.data as { result: DiffResult }

          if (
            !isRemoteUpdate &&
            wsClient &&
            isConnected.value &&
            result.operations.length > 0
          ) {
            const hasChanges = result.operations.some(
              op => op.type !== 'retain',
            )
            if (hasChanges) {
              wsClient.sendDiff(result)
              prevText = textarea.value
            }
          }
          break
        }

        case WorkerEventType.ApplyDiffResult: {
          const { result, error } = e.data

          if (error) {
            console.error('Failed to apply diff:', error)
            wsClient?.requestFullSync()
          } else {
            textarea.value = result
            prevText = result

            if (isSharedBufferEnabled.value && sharedBuffer) {
              sharedBuffer.setText(result)
            }
          }

          nextTick(() => {
            isRemoteUpdate = false
          })
          break
        }
      }
    })

    await nextTick()
    await initSharedBuffer()
  }

  onMounted(async () => {
    await initDiffWorker()
    initWsClient()
  })

  onBeforeUnmount(() => {
    wsClient?.disconnect()
    diffWorker?.terminate()
  })

  watch(textarea, newValue => {
    if (!isRemoteUpdate) {
      sendTextChangeDebounced(newValue)
    }
  })

  return {
    textarea,
    isConnected,
    error,
    isSharedBufferEnabled,
  }
}
