import { Controller, Get } from '@nestjs/common'
import { DiffOperation } from 'diff-lib'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): DiffOperation[] {
    return this.appService.getHello()
  }
}
