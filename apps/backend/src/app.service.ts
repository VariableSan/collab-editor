import { Injectable } from '@nestjs/common'
import { DiffAlgorithm, DiffOperation } from 'diff-lib'

@Injectable()
export class AppService {
  private diffAlgorithm = new DiffAlgorithm()

  getHello(): DiffOperation[] {
    return this.diffAlgorithm.simpleDiff('asd', 'asdx')
  }
}
