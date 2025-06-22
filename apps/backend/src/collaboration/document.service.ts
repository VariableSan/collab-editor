import { Injectable, Logger } from '@nestjs/common'

interface DocumentState {
  content: string
  version: number
  lastModified: Date
  lastModifiedBy?: string
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name)

  // In a real application, this should be in the database
  private document: DocumentState = {
    content: '',
    version: 0,
    lastModified: new Date(),
  }

  getContent(): string {
    return this.document.content
  }

  getVersion(): number {
    return this.document.version
  }

  updateContent(content: string, modifiedBy?: string): number {
    this.document.content = content
    this.document.version += 1
    this.document.lastModified = new Date()
    this.document.lastModifiedBy = modifiedBy

    this.logger.log(
      `Document updated: version=${this.document.version}, ` +
        `length=${content.length}, by=${modifiedBy || 'unknown'}`,
    )

    return this.document.version
  }

  getDocumentState(): DocumentState {
    return { ...this.document }
  }
}
