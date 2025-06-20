export type DiffOp =
  | { type: 'equal'; value: string }
  | { type: 'insert'; value: string }
  | { type: 'delete'; value: string }

export type Diff = DiffOp[]
