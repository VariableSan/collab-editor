import { Module } from '@nestjs/common'
import { CollaborationGateway } from './collaboration.gateway'
import { CollaborationService } from './collaboration.service'
import { DocumentService } from './document.service'

@Module({
  providers: [CollaborationGateway, CollaborationService, DocumentService],
})
export class CollaborationModule {}
