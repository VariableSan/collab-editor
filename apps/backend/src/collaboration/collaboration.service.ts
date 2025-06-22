import { Injectable, Logger } from '@nestjs/common'
import { DiffService } from './diff.service'
import { DocumentService } from './document.service'

interface DiffResult {
  success: boolean
  version?: number
  error?: string
}

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

  applyDiff(diff: any, clientVersion: number, clientId: string): DiffResult {
    try {
      const currentVersion = this.documentService.getVersion()

      if (clientVersion !== currentVersion) {
        this.logger.warn(
          `Version mismatch: client=${clientVersion}, server=${currentVersion}`,
        )
        return { success: false, error: 'Version mismatch' }
      }

      const currentContent = this.documentService.getContent()
      const newContent = this.diffService.applyDiff(currentContent, diff)

      if (
        diff.checksum &&
        !this.diffService.verifyChecksum(newContent, diff.checksum)
      ) {
        this.logger.error('Checksum verification failed')
        return { success: false, error: 'Checksum mismatch' }
      }

      const newVersion = this.documentService.updateContent(
        newContent,
        clientId,
      )

      return {
        success: true,
        version: newVersion,
      }
    } catch (error) {
      this.logger.error(`Error applying diff: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }
}
