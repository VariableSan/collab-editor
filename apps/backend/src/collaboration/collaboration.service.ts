import { Injectable, Logger } from '@nestjs/common'
import { DocumentState } from './collaboration.model'
import { DocumentService } from './document.service'

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name)

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
}
