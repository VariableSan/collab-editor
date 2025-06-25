import { EventEmitter } from 'eventemitter3'
import { io, Socket } from 'socket.io-client'
import {
  ClientState,
  DiffMessage,
  DiffResult,
  WSClientEvents,
  WSClientOptions,
  WSMessage,
} from './types'

export class CollaborativeWSClient extends EventEmitter<WSClientEvents> {
  private socket?: Socket
  private options: Required<WSClientOptions>
  private state: ClientState

  constructor(options: WSClientOptions) {
    super()

    this.options = {
      namespace: '/collaborate',
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...options,
    }

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
        transports: ['websocket'],
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

  sendDiff(diff: DiffResult): void {
    if (!this.state.connected || !this.socket) {
      console.warn('Not connected to server')
      return
    }

    try {
      const message: DiffMessage = {
        id: this.generateId(),
        timestamp: Date.now(),
        data: {
          diff,
          version: this.state.version,
        },
      }

      this.socket.emit('diff', message)

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

    this.socket.on('init', (message: any) => {
      this.handleInit(message)
    })

    this.socket.on('diff', (message: any) => {
      if (message.type === 'diff' && message.data?.diff) {
        this.handleDiff(message)
      }
    })

    this.socket.on('full-sync', (message: any) => {
      this.handleFullSync(message)
    })

    this.socket.on('ack', (message: any) => {
      this.handleAck(message)
    })

    this.socket.on('error', (message: any) => {
      if (message.data?.message) {
        this.handleError(new Error(message.data.message))
      }
    })

    // Backwards compatibility - handle update messages
    this.socket.on('update', (message: any) => {
      if (message.data?.content !== undefined) {
        this.state.currentText = message.data.content
        this.state.version = message.data.version
        this.emit('textChange', message.data.content)
      }
    })
  }

  private handleInit(message: WSMessage): void {
    this.state.currentText = message.data.content
    this.state.version = message.data.version
    this.emit('textChange', this.state.currentText)
    console.log('Initialized with version:', this.state.version)
  }

  private handleDiff(message: WSMessage): void {
    try {
      this.state.version = message.data.version || this.state.version + 1
      this.emit('diffReceived', message.data.diff)
    } catch (error) {
      this.handleError(new Error('Failed to handle diff'))
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

    if (message.data?.version !== undefined) {
      this.state.version = message.data.version
      console.log('Version updated after ack:', this.state.version)
    }
  }

  private requestFullSync(): void {
    if (this.socket?.connected) {
      this.socket.emit('full-sync', {
        id: this.generateId(),
      })
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
