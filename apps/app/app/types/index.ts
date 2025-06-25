export enum WorkerEventType {
  InitSharedBuffer = 'init-shared-buffer',
  SharedBufferReady = 'shared-buffer-ready',
  CalculateDiffFromBuffer = 'calculate-diff-from-buffer',

  CalculateDiff = 'calculate-diff',
  ApplyDiff = 'apply-diff',
  CalculateDiffResult = 'calculate-diff-result',
  ApplyDiffResult = 'apply-diff-result',
}
