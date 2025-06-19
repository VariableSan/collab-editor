import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'

async function bootstrap() {
  const logger = new Logger()
  const app = await NestFactory.create(AppModule, { logger })
  const port = process.env.PORT ?? 3000
  await app.listen(port)
  logger.log(`Started on PORT: ${port}`)
}
bootstrap()
