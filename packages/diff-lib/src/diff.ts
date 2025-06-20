import type { Diff, DiffOp } from './types'

export function simpleDiff(a: string, b: string): Diff {
  const minLen = Math.min(a.length, b.length)
  const ops: DiffOp[] = []
  let i = 0
  while (i < minLen && a[i] === b[i]) {
    i++
  }
  if (i > 0) ops.push({ type: 'equal', value: a.slice(0, i) })
  if (i < a.length) ops.push({ type: 'delete', value: a.slice(i) })
  if (i < b.length) ops.push({ type: 'insert', value: b.slice(i) })
  return ops
}

// Finds the first and last point of mismatch
export function charwiseDiff(a: string, b: string): Diff {
  let start = 0
  let endA = a.length
  let endB = b.length

  // Find the start of a match
  while (start < endA && start < endB && a[start] === b[start]) {
    start++
  }

  // Find the end of a match (from the end)
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  const ops: DiffOp[] = []
  if (start > 0) ops.push({ type: 'equal', value: a.slice(0, start) })
  if (endA > start) ops.push({ type: 'delete', value: a.slice(start, endA) })
  if (endB > start) ops.push({ type: 'insert', value: b.slice(start, endB) })
  if (a.length - endA > 0) ops.push({ type: 'equal', value: a.slice(endA) })

  return ops
}
