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
      version: 0,
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

    const message: DiffMessage = {
      id: this.generateId(),
      timestamp: Date.now(),
      data: {
        diff,
        version: this.state.version,
      },
    }

    this.socket.emit('diff', message)
  }

  requestFullSync(): void {
    if (this.socket?.connected) {
      this.socket.emit('full-sync')
    }
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

    this.socket.on('init', (message: WSMessage) => {
      if (message.data) {
        this.state.version = message.data.version
        this.emit('textChange', message.data.content)
      }
    })

    this.socket.on('diff', (message: WSMessage) => {
      if (message.data?.diff) {
        this.state.version = message.data.version || this.state.version + 1
        this.emit('diffReceived', message.data.diff)
      }
    })

    this.socket.on('full-sync', (message: WSMessage) => {
      if (message.data) {
        this.state.version = message.data.version || 0
        this.emit('textChange', message.data.content)
      }
    })

    this.socket.on('ack', (message: WSMessage) => {
      if (message.data?.version !== undefined) {
        this.state.version = message.data.version
      }
    })

    this.socket.on('error', (message: WSMessage) => {
      if (message.data?.message) {
        this.handleError(new Error(message.data.message))
      }
    })
  }

  private handleError(error: Error): void {
    console.error('WebSocket client error:', error)
    this.emit('error', error)
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}
