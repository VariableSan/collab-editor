import type { DiffOperation } from './types'

export class DiffAlgorithm {
  simpleDiff(a: string, b: string): DiffOperation[] {
    const minLen = Math.min(a.length, b.length)
    const ops: DiffOperation[] = []
    let i = 0
    while (i < minLen && a[i] === b[i]) {
      i++
    }
    if (i > 0) ops.push({ type: 'equal', value: a.slice(0, i) })
    if (i < a.length) ops.push({ type: 'delete', value: a.slice(i) })
    if (i < b.length) ops.push({ type: 'insert', value: b.slice(i) })
    return ops
  }

  charwiseDiff(a: string, b: string): DiffOperation[] {
    let start = 0
    let endA = a.length
    let endB = b.length

    while (start < endA && start < endB && a[start] === b[start]) {
      start++
    }

    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
      endA--
      endB--
    }

    const ops: DiffOperation[] = []
    if (start > 0) ops.push({ type: 'equal', value: a.slice(0, start) })
    if (endA > start) ops.push({ type: 'delete', value: a.slice(start, endA) })
    if (endB > start) ops.push({ type: 'insert', value: b.slice(start, endB) })
    if (a.length - endA > 0) ops.push({ type: 'equal', value: a.slice(endA) })

    return ops
  }
}
