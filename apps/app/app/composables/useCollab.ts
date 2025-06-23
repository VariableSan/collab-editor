import { MyersDiffCalculator } from 'diff-lib'
import { BrowserCollaborativeClient } from 'ws-client'
import DiffWorker from '~/assets/workers/diff-worker?worker'

export const useCollab = () => {
  let wsClient: BrowserCollaborativeClient | null = null

  const textarea = ref('')
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let isRemoteUpdate = false

  const sendTextChange = (val: string) => {
    wsClient?.sendTextChange(val)
  }

  const sendTextChangeDebounced = useDebounceFn(sendTextChange, 500)

  onMounted(() => {
    const workerProvider = new DiffWorker()
    const diffProvider = new MyersDiffCalculator()

    wsClient = new BrowserCollaborativeClient({
      url: `ws://${window.location.hostname}:4000/collaborate`,
      workerProvider,
      diffProvider,
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
      isRemoteUpdate = true
      textarea.value = newText

      nextTick(() => {
        isRemoteUpdate = false
      })
    })

    wsClient.connect()

    onBeforeUnmount(() => {
      wsClient?.disconnect()
    })
  })

  watch(textarea, newValue => {
    if (isRemoteUpdate) return

    if (isConnected.value) {
      sendTextChangeDebounced(newValue)
    }
  })

  return {
    textarea,
    isConnected,
    error,
    wsClient,
  }
}
