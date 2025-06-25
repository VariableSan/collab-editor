export enum WorkerEventType {
  InitSharedBuffer = 'init-shared-buffer',
  SharedBufferInitialized = 'shared-buffer-initialized',
  CalculateDiff = 'calculate-diff',
  ApplyDiff = 'apply-diff',
  CalculateDiffResult = 'calculate-diff-result',
  ApplyDiffResult = 'apply-diff-result',
  SharedBufferChanged = 'shared-buffer-changed',
  SetText = 'set-text',
}
