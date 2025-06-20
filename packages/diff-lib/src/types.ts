export interface DiffOperation {
  type: 'insert' | 'delete' | 'equal'
  value: string
}
