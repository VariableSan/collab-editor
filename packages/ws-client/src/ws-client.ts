import { EventEmitter } from 'eventemitter3'
import {
  ClientState,
  DiffMessage,
  IDiffProvider,
  InitMessage,
  WSClientEvents,
  WSClientOptions,
  WSMessage,
} from './types'

export class CollaborativeWSClient extends EventEmitter<WSClientEvents> {
  private ws?: WebSocket
  private options: Required<WSClientOptions>
  private state: ClientState
  private reconnectAttempts = 0
  private reconnectTimeout?: NodeJS.Timeout
  private heartbeatInterval?: NodeJS.Timeout
  private diffProvider: IDiffProvider

  constructor(options: WSClientOptions) {
    super()

    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...options,
    }

    this.diffProvider = options.diffProvider

    this.state = {
      connected: false,
      currentText: '',
      version: 0,
      pendingChanges: [],
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      this.ws = new WebSocket(this.options.url)
      this.setupEventHandlers()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  disconnect(): void {
    this.clearTimers()

    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }

    this.state.connected = false
    this.emit('disconnect')
  }

  sendTextChange(newText: string): void {
    if (!this.state.connected || !this.ws) {
      console.warn('Not connected to server')
      return
    }

    const diff = this.diffProvider.calculate(this.state.currentText, newText)

    const message: DiffMessage = {
      type: 'diff',
      id: this.generateId(),
      timestamp: Date.now(),
      data: {
        diff,
        version: this.state.version,
      },
    }

    this.ws.send(JSON.stringify(message))
    this.state.currentText = newText
    this.state.pendingChanges.push({
      diff,
      timestamp: message.timestamp!,
    })
  }

  getCurrentText(): string {
    return this.state.currentText
  }

  isConnected(): boolean {
    return this.state.connected
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.state.connected = true
      this.reconnectAttempts = 0
      this.emit('connect')
      this.startHeartbeat()
    }

    this.ws.onclose = event => {
      this.state.connected = false
      this.clearTimers()
      this.emit('disconnect', event.reason)
      this.attemptReconnect()
    }

    this.ws.onerror = event => {
      this.handleError(new Error('WebSocket error'))
    }

    this.ws.onmessage = event => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        this.handleError(new Error('Failed to parse message'))
      }
    }
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'init':
        this.handleInit(message as InitMessage)
        break
      case 'diff':
        this.handleDiff(message as DiffMessage)
        break
      case 'full-sync':
        this.handleFullSync(message)
        break
      case 'ack':
        this.handleAck(message)
        break
      case 'error':
        this.handleError(new Error(message.data?.message || 'Server error'))
        break
    }
  }

  private handleInit(message: InitMessage): void {
    this.state.currentText = message.data.content
    this.state.version = message.data.version
    this.emit('textChange', this.state.currentText)
  }

  private handleDiff(message: DiffMessage): void {
    try {
      const newText = this.diffProvider.apply(
        this.state.currentText,
        message.data.diff,
      )

      this.state.currentText = newText
      this.state.version = message.data.version || this.state.version + 1

      this.emit('diffReceived', message.data.diff)
      this.emit('textChange', newText)
    } catch (error) {
      this.handleError(new Error('Failed to apply diff'))
      // Запрашиваем полную синхронизацию
      this.requestFullSync()
    }
  }

  private handleFullSync(message: WSMessage): void {
    if (message.data?.content) {
      this.state.currentText = message.data.content
      this.state.version = message.data.version || 0
      this.emit('textChange', this.state.currentText)
    }
  }

  private handleAck(message: WSMessage): void {
    // Удаляем подтвержденные изменения из очереди
    if (message.data?.timestamp) {
      this.state.pendingChanges = this.state.pendingChanges.filter(
        change => change.timestamp > message.data.timestamp,
      )
    }
  }

  private requestFullSync(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'full-sync',
          id: this.generateId(),
        }),
      )
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'))
      return
    }

    this.reconnectAttempts++
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, this.options.reconnectInterval)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, this.options.heartbeatInterval)
  }

  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = undefined
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = undefined
    }
  }

  private handleError(error: Error): void {
    console.error('WebSocket client error:', error)
    this.emit('error', error)
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
