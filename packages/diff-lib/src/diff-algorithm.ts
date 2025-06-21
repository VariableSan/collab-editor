import { DiffConfig, DiffOperation, DiffResult } from './types'

/**
 * Myers' diff algorithm implementation
 * Based on "An O(ND) Difference Algorithm and Its Variations" by Eugene W. Myers
 */
export class DiffAlgorithm {
  private timeout: number
  private maxLines: number

  constructor(config: DiffConfig = {}) {
    this.timeout = config.timeout ?? 5000
    this.maxLines = config.maxLines ?? 10000
  }

  /**
   * Calculate diff between two texts using Myers' algorithm
   */
  public calculateDiff(oldText: string, newText: string): DiffResult {
    const startTime = Date.now()

    // Split texts into lines for better diff granularity
    const oldLines = this.splitIntoLines(oldText)
    const newLines = this.splitIntoLines(newText)

    if (oldLines.length > this.maxLines || newLines.length > this.maxLines) {
      throw new Error('Text too large for diff calculation')
    }

    const operations = this.myersDiff(oldLines, newLines, startTime)

    return {
      operations: this.optimizeOperations(operations),
      oldLength: oldText.length,
      newLength: newText.length,
    }
  }

  /**
   * Apply diff operations to transform old text to new text
   */
  public applyDiff(text: string, operations: DiffOperation[]): string {
    let result = ''
    let position = 0

    for (const op of operations) {
      switch (op.type) {
        case 'retain':
          if (op.length) {
            result += text.slice(position, position + op.length)
            position += op.length
          }
          break
        case 'delete':
          if (op.length) {
            position += op.length
          }
          break
        case 'insert':
          if (op.text) {
            result += op.text
          }
          break
      }
    }

    return result
  }

  /**
   * Split text into lines while preserving line endings
   */
  private splitIntoLines(text: string): string[] {
    const lines = text.split('\n')
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      if (i < lines.length - 1) {
        result.push(lines[i] + '\n')
      } else if (lines[i].length > 0) {
        result.push(lines[i])
      }
    }

    return result
  }

  /**
   * Myers' diff algorithm implementation
   */
  private myersDiff(
    oldLines: string[],
    newLines: string[],
    startTime: number,
  ): DiffOperation[] {
    const N = oldLines.length
    const M = newLines.length
    const MAX = N + M

    const V: { [key: number]: number } = {}
    const trace: Array<{ [key: number]: number }> = []

    V[1] = 0

    for (let D = 0; D <= MAX; D++) {
      // Check timeout
      if (Date.now() - startTime > this.timeout) {
        throw new Error('Diff calculation timeout')
      }

      trace.push({ ...V })

      for (let k = -D; k <= D; k += 2) {
        let x: number

        if (k === -D || (k !== D && V[k - 1] < V[k + 1])) {
          x = V[k + 1]
        } else {
          x = V[k - 1] + 1
        }

        let y = x - k

        while (x < N && y < M && oldLines[x] === newLines[y]) {
          x++
          y++
        }

        V[k] = x

        if (x >= N && y >= M) {
          return this.buildDiff(oldLines, newLines, trace, D)
        }
      }
    }

    return []
  }

  /**
   * Build diff operations from the trace
   */
  private buildDiff(
    oldLines: string[],
    newLines: string[],
    trace: Array<{ [key: number]: number }>,
    D: number,
  ): DiffOperation[] {
    const operations: DiffOperation[] = []
    let x = oldLines.length
    let y = newLines.length

    for (let d = D; d > 0; d--) {
      const V = trace[d]
      const k = x - y

      let prevK: number
      if (k === -d || (k !== d && V[k - 1] < V[k + 1])) {
        prevK = k + 1
      } else {
        prevK = k - 1
      }

      const prevX = V[prevK]
      const prevY = prevX - prevK

      while (x > prevX && y > prevY) {
        operations.unshift({
          type: 'retain',
          length: oldLines[x - 1].length,
          position: this.calculatePosition(oldLines, x - 1),
        })
        x--
        y--
      }

      if (d > 0) {
        if (x > prevX) {
          operations.unshift({
            type: 'delete',
            length: oldLines[x - 1].length,
            position: this.calculatePosition(oldLines, x - 1),
          })
          x--
        } else if (y > prevY) {
          operations.unshift({
            type: 'insert',
            text: newLines[y - 1],
            position: this.calculatePosition(oldLines, x),
          })
          y--
        }
      }
    }

    return operations
  }

  /**
   * Calculate character position from line index
   */
  private calculatePosition(lines: string[], lineIndex: number): number {
    let position = 0
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      position += lines[i].length
    }
    return position
  }

  /**
   * Optimize operations by merging consecutive operations of the same type
   */
  private optimizeOperations(operations: DiffOperation[]): DiffOperation[] {
    const optimized: DiffOperation[] = []
    let current: DiffOperation | null = null

    for (const op of operations) {
      if (current && current.type === op.type) {
        if (op.type === 'retain' || op.type === 'delete') {
          current.length = (current.length || 0) + (op.length || 0)
        } else if (op.type === 'insert') {
          current.text = (current.text || '') + (op.text || '')
        }
      } else {
        if (current) {
          optimized.push(current)
        }
        current = { ...op }
      }
    }

    if (current) {
      optimized.push(current)
    }

    return optimized
  }
}
