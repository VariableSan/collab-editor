import {
  ClientInfo,
  ConnectionState,
  Diff,
  DiffLib,
  DiffOperationMessage,
  DocumentStateMessage,
  DocumentSyncState,
  MessageType,
  WebSocketClientConfig,
  WebSocketEventListeners,
  WebSocketMessage,
} from './types'

/**
 * WebSocket client with diff-based synchronization
 */
export class WebSocketClient {
  private config: Required<WebSocketClientConfig>
  private ws: WebSocket | null = null
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private listeners: WebSocketEventListeners = {}
  private diffLib: DiffLib

  private clientId: string
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private connectionTimer: NodeJS.Timeout | null = null

  private documentState: DocumentSyncState = {
    content: '',
    version: 0,
    lastSync: 0,
    pendingOperations: [],
    isInSync: true,
  }

  constructor(
    config: WebSocketClientConfig,
    diffLib: DiffLib,
    listeners: WebSocketEventListeners = {},
  ) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
      connectionTimeout: 10000,
      protocols: [],
      headers: {},
      ...config,
    }

    this.listeners = listeners
    this.diffLib = diffLib
    this.clientId = this.generateClientId()
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    if (
      this.connectionState === ConnectionState.CONNECTED ||
      this.connectionState === ConnectionState.CONNECTING
    ) {
      return
    }

    this.setConnectionState(ConnectionState.CONNECTING)

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols)

        // Set up connection timeout
        this.connectionTimer = setTimeout(() => {
          this.handleConnectionTimeout()
          reject(new Error('Connection timeout'))
        }, this.config.connectionTimeout)

        this.ws.onopen = () => {
          this.handleConnectionOpen()
          resolve()
        }

        this.ws.onmessage = event => {
          this.handleMessage(event)
        }

        this.ws.onclose = event => {
          this.handleConnectionClose(event)
        }

        this.ws.onerror = event => {
          this.handleConnectionError(event)
          reject(new Error('WebSocket connection error'))
        }
      } catch (error) {
        this.setConnectionState(ConnectionState.ERROR)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.clearTimers()
    this.reconnectAttempts = 0

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Client disconnect')
    }

    this.ws = null
    this.setConnectionState(ConnectionState.DISCONNECTED)
  }

  /**
   * Send a diff operation to the server
   */
  public async sendDiffOperation(
    oldText: string,
    newText: string,
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to server')
    }

    try {
      const diff = await this.diffLib.calculateDiff(oldText, newText)

      const message: DiffOperationMessage = {
        type: MessageType.DIFF_OPERATION,
        operations: diff.operations,
        baseVersion: this.documentState.version,
        newVersion: this.documentState.version + 1,
        originClientId: this.clientId,
        timestamp: Date.now(),
      }

      this.sendMessage(message)

      // Update local state optimistically
      this.documentState.content = newText
      this.documentState.version += 1
      this.documentState.lastSync = Date.now()
    } catch (error) {
      console.error('Failed to send diff operation:', error)
      throw error
    }
  }

  /**
   * Apply a received diff operation to local content
   */
  public async applyDiffOperation(
    operations: Diff,
    baseContent?: string,
  ): Promise<string> {
    const content = baseContent || this.documentState.content

    try {
      const result = await this.diffLib.applyDiff(content, operations)
      return result
    } catch (error) {
      console.error('Failed to apply diff operation:', error)
      throw error
    }
  }

  /**
   * Request full document state from server
   */
  public requestDocumentState(): void {
    if (!this.isConnected()) {
      throw new Error('Not connected to server')
    }

    const message = {
      type: MessageType.DOCUMENT_STATE,
      timestamp: Date.now(),
      clientId: this.clientId,
    }

    this.sendMessage(message)
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Get current document state
   */
  public getDocumentState(): DocumentSyncState {
    return { ...this.documentState }
  }

  /**
   * Get client information
   */
  public getClientInfo(): ClientInfo {
    return {
      id: this.clientId,
      isConnected: this.isConnected(),
      lastActivity: this.documentState.lastSync,
    }
  }

  /**
   * Update event listeners
   */
  public updateListeners(listeners: Partial<WebSocketEventListeners>): void {
    this.listeners = { ...this.listeners, ...listeners }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.disconnect()
    this.diffLib.dispose()
  }

  /**
   * Check if client is connected
   */
  private isConnected(): boolean {
    return (
      this.ws !== null &&
      this.ws.readyState === WebSocket.OPEN &&
      this.connectionState === ConnectionState.CONNECTED
    )
  }

  /**
   * Handle connection open
   */
  private handleConnectionOpen(): void {
    this.clearConnectionTimer()
    this.setConnectionState(ConnectionState.CONNECTED)
    this.reconnectAttempts = 0
    this.startPingTimer()

    // Request initial document state
    this.requestDocumentState()
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      // Update last activity
      this.documentState.lastSync = Date.now()

      // Handle different message types
      switch (message.type) {
        case MessageType.DOCUMENT_STATE:
          this.handleDocumentStateMessage(message as DocumentStateMessage)
          break
        case MessageType.DIFF_OPERATION:
          this.handleDiffOperationMessage(message as DiffOperationMessage)
          break
        case MessageType.USER_JOIN:
          this.listeners.onUserJoin?.(message as any)
          break
        case MessageType.USER_LEAVE:
          this.listeners.onUserLeave?.(message as any)
          break
        case MessageType.ERROR:
          this.listeners.onError?.(message as any)
          break
        case MessageType.PING:
          this.handlePing()
          break
        case MessageType.PONG:
          // Pong received, connection is healthy
          break
      }

      // Notify general message listener
      this.listeners.onMessage?.(message)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Handle document state message
   */
  private handleDocumentStateMessage(message: DocumentStateMessage): void {
    this.documentState = {
      content: message.content,
      version: message.version,
      lastSync: Date.now(),
      pendingOperations: [],
      isInSync: true,
    }

    this.listeners.onDocumentState?.(message)
  }

  /**
   * Handle diff operation message
   */
  private async handleDiffOperationMessage(
    message: DiffOperationMessage,
  ): Promise<void> {
    // Don't apply operations from this client
    if (message.originClientId === this.clientId) {
      return
    }

    try {
      const newContent = await this.applyDiffOperation(
        message.operations,
        this.documentState.content,
      )

      this.documentState = {
        content: newContent,
        version: message.newVersion,
        lastSync: Date.now(),
        pendingOperations: [],
        isInSync: true,
      }

      this.listeners.onDiffOperation?.(message)
    } catch (error) {
      console.error('Failed to apply received diff operation:', error)
      // Request full document state to resync
      this.requestDocumentState()
    }
  }

  /**
   * Handle ping message
   */
  private handlePing(): void {
    const pongMessage = {
      type: MessageType.PONG,
      timestamp: Date.now(),
      clientId: this.clientId,
    }

    this.sendMessage(pongMessage)
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(event: CloseEvent): void {
    this.clearTimers()

    if (event.wasClean) {
      this.setConnectionState(ConnectionState.DISCONNECTED)
    } else {
      this.setConnectionState(ConnectionState.ERROR)
      this.scheduleReconnect()
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(event: Event): void {
    this.clearTimers()
    this.setConnectionState(ConnectionState.ERROR)
    this.scheduleReconnect()
  }

  /**
   * Handle connection timeout
   */
  private handleConnectionTimeout(): void {
    this.clearConnectionTimer()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.setConnectionState(ConnectionState.ERROR)
    this.scheduleReconnect()
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setConnectionState(ConnectionState.ERROR)
      return
    }

    this.setConnectionState(ConnectionState.RECONNECTING)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
        this.scheduleReconnect()
      })
    }, this.config.reconnectInterval)
  }

  /**
   * Start ping timer for connection health
   */
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        const pingMessage = {
          type: MessageType.PING,
          timestamp: Date.now(),
          clientId: this.clientId,
        }

        this.sendMessage(pingMessage)
      }
    }, this.config.pingInterval)
  }

  /**
   * Send message to server
   */
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      throw new Error('WebSocket is not connected')
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.listeners.onConnectionStateChange?.(state)
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearConnectionTimer()
    this.clearReconnectTimer()
    this.clearPingTimer()
  }

  /**
   * Clear connection timer
   */
  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Clear ping timer
   */
  private clearPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
