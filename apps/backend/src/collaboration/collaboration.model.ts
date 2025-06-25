export interface WSMessage {
  type: 'init' | 'update' | 'diff' | 'full-sync' | 'error' | 'ack'
  id?: string
  data?: any
  timestamp?: number
}

export interface UpdateMessage {
  id?: string
  data: {
    content: string
    version: number
  }
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

export interface DocumentState {
  content: string
  version: number
}

export interface DiffOperation {
  type: 'insert' | 'delete' | 'retain'
  value: string
  position?: number
}

export interface DiffResult {
  operations: DiffOperation[]
  checksum?: string
}
