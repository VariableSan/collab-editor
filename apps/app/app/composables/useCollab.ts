import { MyersDiffCalculator } from 'diff-lib'
import { CollaborativeWSClient } from 'ws-client'

export const useCollab = () => {
  let wsClient: CollaborativeWSClient | null = null

  const textarea = ref('')
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let isRemoteUpdate = false
  let lastSentValue = ''

  const sendTextChange = (val: string) => {
    if (!isRemoteUpdate && wsClient && val !== lastSentValue) {
      wsClient.sendTextChange(val)
      lastSentValue = val
    }
  }

  const sendTextChangeDebounced = useDebounceFn(sendTextChange, 500)

  onMounted(() => {
    const diffProvider = new MyersDiffCalculator()

    wsClient = new CollaborativeWSClient({
      url: `${window.location.hostname}:4000`,
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
      lastSentValue = newText
      nextTick(() => {
        isRemoteUpdate = false
      })
    })

    wsClient.connect()
  })

  watch(textarea, newValue => {
    sendTextChangeDebounced(newValue)
  })

  onUnmounted(() => {
    wsClient?.disconnect()
  })

  return {
    textarea,
    isConnected,
    error,
  }
}
