import { Injectable } from '@nestjs/common'

@Injectable()
export class DocumentService {
  private content = ''
  private version = 0
  private lastModifiedBy: string | null = null
  private lastModifiedAt: Date | null = null

  getContent(): string {
    return this.content
  }

  getVersion(): number {
    return this.version
  }

  updateContent(newContent: string, clientId: string): number {
    this.content = newContent
    this.version++
    this.lastModifiedBy = clientId
    this.lastModifiedAt = new Date()

    return this.version
  }

  getMetadata() {
    return {
      version: this.version,
      lastModifiedBy: this.lastModifiedBy,
      lastModifiedAt: this.lastModifiedAt,
      contentLength: this.content.length,
    }
  }
}
