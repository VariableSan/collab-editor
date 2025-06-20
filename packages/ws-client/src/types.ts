export type DiffOperation<T = string, V = string> = {
  type: T
  value: V
}
export type DiffResult = {
  operations: DiffOperation[]
  oldLength: number
  newLength: number
}

export abstract class DiffLib {
  public abstract calculateDiff(
    oldText: string,
    newText: string,
  ): Promise<DiffResult>
  public abstract applyDiff(
    text: string,
    operations: DiffOperation[],
  ): Promise<string>
  public abstract dispose(): void
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export enum MessageType {
  DOCUMENT_STATE = 'document_state',
  DIFF_OPERATION = 'diff_operation',
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
}

export interface BaseMessage {
  type: MessageType
  timestamp: number
  clientId?: string
}

export interface DocumentStateMessage extends BaseMessage {
  type: MessageType.DOCUMENT_STATE
  content: string
  version: number
}

export interface DiffOperationMessage extends BaseMessage {
  type: MessageType.DIFF_OPERATION
  operations: DiffOperation[]
  baseVersion: number
  newVersion: number
  originClientId: string
}

export interface UserJoinMessage extends BaseMessage {
  type: MessageType.USER_JOIN
  userId: string
  userInfo?: Record<string, any>
}

export interface UserLeaveMessage extends BaseMessage {
  type: MessageType.USER_LEAVE
  userId: string
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR
  error: string
  code?: string
}

export interface PingMessage extends BaseMessage {
  type: MessageType.PING
}

export interface PongMessage extends BaseMessage {
  type: MessageType.PONG
}

export type WebSocketMessage =
  | DocumentStateMessage
  | DiffOperationMessage
  | UserJoinMessage
  | UserLeaveMessage
  | ErrorMessage
  | PingMessage
  | PongMessage

export interface WebSocketClientConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  connectionTimeout?: number
  protocols?: string[]
  headers?: Record<string, string>
}

export interface WebSocketEventListeners {
  onConnectionStateChange?: (state: ConnectionState) => void
  onDocumentState?: (message: DocumentStateMessage) => void
  onDiffOperation?: (message: DiffOperationMessage) => void
  onUserJoin?: (message: UserJoinMessage) => void
  onUserLeave?: (message: UserLeaveMessage) => void
  onError?: (message: ErrorMessage) => void
  onMessage?: (message: WebSocketMessage) => void
}

export interface ClientInfo {
  id: string
  isConnected: boolean
  lastActivity: number
}

export interface DocumentSyncState {
  content: string
  version: number
  lastSync: number
  pendingOperations: DiffOperation[]
  isInSync: boolean
}
