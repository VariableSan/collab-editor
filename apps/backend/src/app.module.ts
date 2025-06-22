import { Module } from '@nestjs/common'
import { CollaborationModule } from './collaboration/collaboration.module'

@Module({
  imports: [CollaborationModule],
})
export class AppModule {}
