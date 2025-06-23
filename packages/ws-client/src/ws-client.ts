import { EventEmitter } from 'eventemitter3'
import { io, Socket } from 'socket.io-client'
import {
  ClientState,
  DiffMessage,
  DiffProvider,
  InitMessage,
  WSClientEvents,
  WSClientOptions,
  WSMessage,
} from './types'

export class CollaborativeWSClient extends EventEmitter<WSClientEvents> {
  private socket?: Socket
  private options: Required<WSClientOptions>
  private state: ClientState
  private diffProvider: DiffProvider

  constructor(options: WSClientOptions) {
    super()

    this.options = {
      namespace: '/collaborate',
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
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
    if (this.socket?.connected) {
      return
    }

    try {
      this.socket = io(this.options.url + this.options.namespace, {
        reconnection: true,
        reconnectionDelay: this.options.reconnectInterval,
        reconnectionAttempts: this.options.maxReconnectAttempts,
        transports: ['websocket', 'polling'],
      })

      this.setupEventHandlers()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = undefined
    }

    this.state.connected = false
    this.emit('disconnect')
  }

  sendTextChange(newText: string): void {
    if (!this.state.connected || !this.socket) {
      console.warn('Not connected to server')
      return
    }

    try {
      const diff = this.diffProvider.calculate(this.state.currentText, newText)

      const message: DiffMessage = {
        id: this.generateId(),
        timestamp: Date.now(),
        data: {
          diff,
          version: this.state.version,
        },
      }

      this.socket.emit('diff', message)

      this.state.currentText = newText
      this.state.pendingChanges.push({
        diff,
        timestamp: message.timestamp!,
      })
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  getCurrentText(): string {
    return this.state.currentText
  }

  isConnected(): boolean {
    return this.state.connected
  }

  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      this.state.connected = true
      this.emit('connect')
      console.log('Socket.IO connected')
    })

    this.socket.on('disconnect', reason => {
      this.state.connected = false
      this.emit('disconnect', reason)
      console.log('Socket.IO disconnected:', reason)
    })

    this.socket.on('connect_error', error => {
      this.handleError(new Error(`Connection error: ${error.message}`))
    })

    this.socket.on('message', (data: string) => {
      try {
        const message: WSMessage = JSON.parse(data)
        this.handleMessage(message)
      } catch (error) {
        this.handleError(new Error('Failed to parse message'))
      }
    })

    this.socket.on('init', (message: InitMessage) => {
      this.handleInit(message)
    })

    this.socket.on('diff', (message: WSMessage) => {
      if (message.type === 'diff' && message.data) {
        this.handleDiff(message)
      }
    })

    this.socket.on('full-sync', (message: WSMessage) => {
      this.handleFullSync(message)
    })

    this.socket.on('ack', (message: WSMessage) => {
      this.handleAck(message)
    })

    this.socket.on('error', (message: WSMessage) => {
      if (message.data?.message) {
        this.handleError(new Error(message.data.message))
      }
    })

    this.socket.on('pong', () => {})
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'init':
        this.handleInit(message as InitMessage)
        break
      case 'diff':
        this.handleDiff(message)
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
    console.log('Initialized with version:', this.state.version)
  }

  private handleDiff(message: WSMessage): void {
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

      this.requestFullSync()
    }
  }

  private handleFullSync(message: WSMessage): void {
    if (message.data?.content !== undefined) {
      this.state.currentText = message.data.content
      this.state.version = message.data.version || 0
      this.emit('textChange', this.state.currentText)
      console.log('Full sync completed, version:', this.state.version)
    }
  }

  private handleAck(message: WSMessage): void {
    if (message.data?.timestamp) {
      this.state.pendingChanges = this.state.pendingChanges.filter(
        change => change.timestamp > message.data.timestamp,
      )
    }
  }

  private requestFullSync(): void {
    if (this.socket?.connected) {
      this.socket.emit('full-sync', {
        id: this.generateId(),
      })
    }
  }

  sendPing(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping')
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
