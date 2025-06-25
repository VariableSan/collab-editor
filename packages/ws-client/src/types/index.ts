export interface DiffOperation {
  type: 'insert' | 'delete' | 'retain'
  value: string
  position?: number
}

export interface DiffResult {
  operations: DiffOperation[]
  checksum?: string
}

export interface WSMessage {
  type: 'init' | 'diff' | 'full-sync' | 'error' | 'ack'
  id?: string
  data?: any
  timestamp?: number
}

export interface DiffMessage {
  id?: string
  data: {
    diff: DiffResult
    version?: number
  }
  timestamp?: number
}

export interface WSClientOptions {
  url: string
  namespace?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
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
  version: number
}
