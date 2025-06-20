import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import type { Diff } from 'diff-lib'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): Diff {
    return this.appService.getHello()
  }
}
