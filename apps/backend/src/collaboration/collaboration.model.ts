export interface WSMessage {
  type: 'init' | 'update' | 'full-sync' | 'error' | 'ack'
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

export interface DocumentState {
  content: string
  version: number
}
