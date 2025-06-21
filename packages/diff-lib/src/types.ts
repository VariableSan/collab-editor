export interface DiffOperation {
  type: 'insert' | 'delete' | 'retain'
  length?: number
  text?: string
  position: number
}

export interface DiffResult {
  operations: DiffOperation[]
  oldLength: number
  newLength: number
}

export interface DiffConfig {
  timeout?: number
  maxLines?: number
}

export interface WorkerMessage {
  id: string
  type: 'diff' | 'apply'
  payload: DiffPayload | ApplyPayload
}

export interface DiffPayload {
  oldText: string
  newText: string
  config?: DiffConfig
}

export interface ApplyPayload {
  text: string
  operations: DiffOperation[]
}

export interface WorkerResponse {
  id: string
  success: boolean
  result?: DiffResult | string
  error?: string
}
