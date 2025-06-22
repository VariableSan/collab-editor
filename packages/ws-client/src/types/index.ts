export interface IDiffProvider {
  calculate(
    oldText: string,
    newText: string,
  ): {
    operations: Array<{
      type: 'insert' | 'delete' | 'retain'
      value: string
    }>
    checksum?: string
  }
  apply(
    text: string,
    diff: {
      operations: Array<{
        type: 'insert' | 'delete' | 'retain'
        value: string
      }>
    },
  ): string
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
    diff: {
      operations: Array<{
        type: 'insert' | 'delete' | 'retain'
        value: string
      }>
      checksum?: string
    }
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
  diffProvider: IDiffProvider
}

export interface WSClientEvents {
  connect: () => void
  disconnect: (reason?: string) => void
  error: (error: Error) => void
  textChange: (newText: string) => void
  diffReceived: (diff: any) => void
}

export interface ClientState {
  connected: boolean
  currentText: string
  version: number
  pendingChanges: Array<{
    diff: any
    timestamp: number
  }>
}
