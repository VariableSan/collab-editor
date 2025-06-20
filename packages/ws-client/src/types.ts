export type DiffOp =
  | {
      type: 'equal'
      value: string
    }
  | {
      type: 'insert'
      value: string
    }
  | {
      type: 'delete'
      value: string
    }
export type Diff = DiffOp[]

export abstract class DiffLib {
  public abstract calculateDiff(
    oldText: string,
    newText: string,
    config?: any,
  ): Promise<any>

  public abstract applyDiff(text: string, operations: any[]): Promise<string>

  public abstract dispose(): void
}

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * WebSocket message types
 */
export enum MessageType {
  DOCUMENT_STATE = 'document_state',
  DIFF_OPERATION = 'diff_operation',
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * Base message interface
 */
export interface BaseMessage {
  type: MessageType
  timestamp: number
  clientId?: string
}

/**
 * Document state message (full document sync)
 */
export interface DocumentStateMessage extends BaseMessage {
  type: MessageType.DOCUMENT_STATE
  content: string
  version: number
}

/**
 * Diff operation message (incremental changes)
 */
export interface DiffOperationMessage extends BaseMessage {
  type: MessageType.DIFF_OPERATION
  operations: Diff
  baseVersion: number
  newVersion: number
  originClientId: string
}

/**
 * User join/leave messages
 */
export interface UserJoinMessage extends BaseMessage {
  type: MessageType.USER_JOIN
  userId: string
  userInfo?: Record<string, any>
}

export interface UserLeaveMessage extends BaseMessage {
  type: MessageType.USER_LEAVE
  userId: string
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR
  error: string
  code?: string
}

/**
 * Ping/Pong messages for connection health
 */
export interface PingMessage extends BaseMessage {
  type: MessageType.PING
}

export interface PongMessage extends BaseMessage {
  type: MessageType.PONG
}

/**
 * Union type for all possible messages
 */
export type WebSocketMessage =
  | DocumentStateMessage
  | DiffOperationMessage
  | UserJoinMessage
  | UserLeaveMessage
  | ErrorMessage
  | PingMessage
  | PongMessage

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  connectionTimeout?: number
  protocols?: string[]
  headers?: Record<string, string>
}

/**
 * Event listeners interface
 */
export interface WebSocketEventListeners {
  onConnectionStateChange?: (state: ConnectionState) => void
  onDocumentState?: (message: DocumentStateMessage) => void
  onDiffOperation?: (message: DiffOperationMessage) => void
  onUserJoin?: (message: UserJoinMessage) => void
  onUserLeave?: (message: UserLeaveMessage) => void
  onError?: (message: ErrorMessage) => void
  onMessage?: (message: WebSocketMessage) => void
}

/**
 * Client information
 */
export interface ClientInfo {
  id: string
  isConnected: boolean
  lastActivity: number
}

/**
 * Document synchronization state
 */
export interface DocumentSyncState {
  content: string
  version: number
  lastSync: number
  pendingOperations: Diff
  isInSync: boolean
}
