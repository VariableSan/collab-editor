/* eslint-disable @typescript-eslint/no-unused-vars */
import { MyersDiffCalculator, type DiffResult } from 'diff-lib'
import { CollaborativeWSClient } from 'ws-client'
import DiffWorker from '~/assets/workers/diff-worker?worker'
import { WorkerEventType } from '~/types'

const DELAY_MS = 300

export const useCollab = () => {
  let wsClient: CollaborativeWSClient | null = null
  let diffWorker: Worker | null = null

  const textarea = ref('')
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let isRemoteUpdate = false
  let prevText = ''

  const sendTextChange = (val: string) => {
    diffWorker?.postMessage({
      type: WorkerEventType.CalculateDiff,
      oldText: prevText,
      newText: textarea.value,
    })
    prevText = val
  }

  const sendTextChangeDebounced = useDebounceFn(sendTextChange, DELAY_MS)

  const initWsClient = () => {
    const diffProvider = new MyersDiffCalculator()

    wsClient = new CollaborativeWSClient({
      url: `${window.location.hostname}:4000`,
      diffProvider,
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
      console.log('Received text update')
      isRemoteUpdate = true
      textarea.value = newText
      nextTick(() => {
        isRemoteUpdate = false
      })
    })

    wsClient.connect()
  }

  const initDiffWorker = () => {
    diffWorker = new DiffWorker()

    diffWorker.addEventListener('message', e => {
      if (e.data.type === WorkerEventType.CalculateDiffResult) {
        const { result } = e.data as { result: DiffResult }
        console.info(result)
        /* if (!isRemoteUpdate && wsClient && isConnected.value) {
          wsClient.sendTextChange(val)
        } */
      }
      if (e.data.type === WorkerEventType.ApplyDiffResult) {
        // TODO
      }
    })
  }

  onMounted(() => {
    initWsClient()
    initDiffWorker()
  })

  onBeforeUnmount(() => {
    wsClient?.disconnect()
    diffWorker?.terminate()
  })

  watch(textarea, newValue => {
    sendTextChangeDebounced(newValue)
  })

  return {
    textarea,
    isConnected,
    error,
  }
}
