import { DiffAlgorithm } from './diff-algorithm'
import { DiffConfig, DiffOperation, DiffResult } from './types'
import { WorkerManager } from './worker-manager'

export class DiffLib {
  private syncAlgorithm: DiffAlgorithm
  private workerManager: WorkerManager

  constructor(config?: DiffConfig) {
    this.syncAlgorithm = new DiffAlgorithm(config)
    this.workerManager = new WorkerManager()
  }

  public async calculateDiff(
    oldText: string,
    newText: string,
    config?: DiffConfig,
  ): Promise<DiffResult> {
    try {
      return await this.workerManager.calculateDiff(oldText, newText, config)
    } catch (error) {
      console.warn('Worker failed, falling back to sync calculation:', error)
      return this.calculateDiffSync(oldText, newText)
    }
  }

  public async applyDiff(
    text: string,
    operations: DiffOperation[],
  ): Promise<string> {
    try {
      return await this.workerManager.applyDiff(text, operations)
    } catch (error) {
      console.warn('Worker failed, falling back to sync application:', error)
      return this.applyDiffSync(text, operations)
    }
  }

  public dispose(): void {
    this.workerManager.terminate()
  }

  private calculateDiffSync(oldText: string, newText: string): DiffResult {
    return this.syncAlgorithm.calculateDiff(oldText, newText)
  }

  private applyDiffSync(text: string, operations: DiffOperation[]): string {
    return this.syncAlgorithm.applyDiff(text, operations)
  }
}
