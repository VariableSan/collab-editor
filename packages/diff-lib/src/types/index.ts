export interface DiffOperation {
  type: 'insert' | 'delete' | 'retain'
  value: string
  position?: number
}

export interface DiffResult {
  operations: DiffOperation[]
  checksum?: string
}

export interface DiffCalculator {
  calculate(oldText: string, newText: string): DiffResult
  apply(text: string, diff: DiffResult): string
}

export interface SharedBufferConfig {
  maxLength: number
  encoding?: 'utf-8' | 'utf-16'
}

export interface SharedBufferData {
  buffer: SharedArrayBuffer
  textLength: Int32Array
  lockArray: Int32Array
}
