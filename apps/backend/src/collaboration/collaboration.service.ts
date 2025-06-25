import { Injectable, Logger } from '@nestjs/common'
import { DiffResult } from 'diff-lib'
import { ApplyDiffResult } from './collaboration.model'
import { DiffService } from './diff.service'
import { DocumentService } from './document.service'

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name)

  constructor(
    private readonly documentService: DocumentService,
    private readonly diffService: DiffService,
  ) {}

  getInitialState() {
    return {
      content: this.documentService.getContent(),
      version: this.documentService.getVersion(),
    }
  }

  getCurrentState() {
    return this.getInitialState()
  }

  applyDiff(
    diff: DiffResult,
    clientVersion: number,
    clientId: string,
  ): ApplyDiffResult {
    try {
      const currentVersion = this.documentService.getVersion()

      if (clientVersion !== currentVersion) {
        this.logger.warn(
          `Version mismatch for client ${clientId}: client=${clientVersion}, server=${currentVersion}`,
        )
        return {
          success: false,
          version: currentVersion,
          error: 'Version mismatch',
        }
      }

      const currentContent = this.documentService.getContent()
      const newContent = this.diffService.applyDiff(currentContent, diff)

      const newVersion = this.documentService.updateContent(
        newContent,
        clientId,
      )

      this.logger.log(
        `Applied diff from ${clientId}: v${clientVersion} -> v${newVersion}`,
      )

      return {
        success: true,
        version: newVersion,
      }
    } catch (error) {
      this.logger.error(
        `Failed to apply diff from ${clientId}: ${error.message}`,
      )
      return {
        success: false,
        version: this.documentService.getVersion(),
        error: error.message,
      }
    }
  }
}
