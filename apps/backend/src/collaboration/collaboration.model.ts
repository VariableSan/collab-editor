import { DiffResult } from 'diff-lib'

export interface WSMessage {
  type: 'init' | 'diff' | 'full-sync' | 'error' | 'ack' | 'pong'
  id?: string
  data?: any
  timestamp?: number
}

export interface DiffMessage {
  id?: string
  data: {
    diff: DiffResult
    version: number
  }
  timestamp?: number
}

export interface ApplyDiffResult {
  success: boolean
  version: number
  error?: string
}

export interface DocumentState {
  content: string
  version: number
}
