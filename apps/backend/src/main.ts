import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger()
  const app = await NestFactory.create(AppModule, { logger })

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })

  app.useWebSocketAdapter(new IoAdapter(app))

  const port = process.env.PORT ?? 4000
  await app.listen(port)

  logger.log(`Backend is running on: http://localhost:${port}`)
  logger.log(`WebSocket is available on: ws://localhost:${port}`)
}
bootstrap()
