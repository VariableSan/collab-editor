export interface DiffProvider {
  calculate(oldText: string, newText: string): DiffResult
  apply(text: string, diff: DiffResult): string
}

export interface DiffResult {
  operations: Array<{
    type: 'insert' | 'delete' | 'retain'
    value: string
  }>
  checksum?: string
}

export interface WSMessage {
  type: 'init' | 'diff' | 'full-sync' | 'error' | 'ack'
  id?: string
  data?: any
  timestamp?: number
}

export interface DiffMessage extends WSMessage {
  type: 'diff'
  data: {
    diff: DiffResult
    version?: number
  }
}

export interface InitMessage extends WSMessage {
  type: 'init'
  data: {
    content: string
    version: number
  }
}

export interface WSClientOptions {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  diffProvider: DiffProvider
  workerProvider?: Worker
}

export interface WSClientEvents {
  connect: () => void
  disconnect: (reason?: string) => void
  error: (error: Error) => void
  textChange: (newText: string) => void
  diffReceived: (diff: DiffResult) => void
}

export interface ClientState {
  connected: boolean
  currentText: string
  version: number
  pendingChanges: Array<{
    diff: DiffResult
    timestamp: number
  }>
}
