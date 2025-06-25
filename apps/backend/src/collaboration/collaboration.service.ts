import { Injectable, Logger } from '@nestjs/common'
import { MyersDiffCalculator } from 'diff-lib'
import { DiffResult, DocumentState } from './collaboration.model'
import { DocumentService } from './document.service'

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name)
  private readonly diffCalculator = new MyersDiffCalculator()

  constructor(private readonly documentService: DocumentService) {}

  getInitialState(): DocumentState {
    return {
      content: this.documentService.getContent(),
      version: this.documentService.getVersion(),
    }
  }

  getCurrentState(): DocumentState {
    return this.getInitialState()
  }

  updateContent(content: string, clientId: string): number {
    const newVersion = this.documentService.updateContent(content, clientId)

    this.logger.log(
      `Content updated by ${clientId}, new version: ${newVersion}`,
    )

    return newVersion
  }

  applyDiff(
    diff: DiffResult,
    clientId: string,
  ): { version: number; content: string } {
    try {
      const currentContent = this.documentService.getContent()
      const newContent = this.diffCalculator.apply(currentContent, diff)

      const newVersion = this.documentService.updateContent(
        newContent,
        clientId,
      )

      this.logger.log(`Diff applied by ${clientId}, new version: ${newVersion}`)

      return {
        version: newVersion,
        content: newContent,
      }
    } catch (error) {
      this.logger.error('Failed to apply diff:', error)
      throw new Error('Failed to apply diff: ' + error.message)
    }
  }

  calculateDiff(oldContent: string, newContent: string): DiffResult {
    return this.diffCalculator.calculate(oldContent, newContent)
  }
}
