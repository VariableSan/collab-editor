import { Injectable } from '@nestjs/common'
import type { Diff } from 'diff-lib'
import { simpleDiff } from 'diff-lib'

@Injectable()
export class AppService {
  getHello(): Diff {
    return simpleDiff('asd', 'asdx')
  }
}
