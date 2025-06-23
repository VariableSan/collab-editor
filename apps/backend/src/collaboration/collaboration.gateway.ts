import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { CollaborationService } from './collaboration.service'

@WebSocketGateway({
  namespace: '/collaborate',
  cors: {
    origin: '*',
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(CollaborationGateway.name)

  constructor(private readonly collaborationService: CollaborationService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`)

    const initData = this.collaborationService.getInitialState()

    // Отправляем через Socket.IO событие
    client.emit(
      'message',
      JSON.stringify({
        type: 'init',
        data: initData,
      }),
    )

    // Или напрямую типизированное событие
    /* client.emit('init', {
      type: 'init',
      data: initData,
    }) */
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('diff')
  handleDiff(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      this.logger.log('Received diff:', data)

      const result = this.collaborationService.applyDiff(
        data.data.diff,
        data.data.version,
        client.id,
      )

      if (result.success) {
        // Отправляем подтверждение
        client.emit('ack', {
          type: 'ack',
          id: data.id,
          data: {
            version: result.version,
            timestamp: data.timestamp,
          },
        })

        // Рассылаем всем кроме отправителя
        client.broadcast.emit(
          'message',
          JSON.stringify({
            type: 'diff',
            data: {
              diff: data.data.diff,
              version: result.version,
            },
          }),
        )

        // Или напрямую
        /* client.broadcast.emit('diff', {
          type: 'diff',
          data: {
            diff: data.data.diff,
            version: result.version,
          },
        }) */
      } else {
        this.sendFullSync(client)
      }
    } catch (error) {
      this.logger.error('Error applying diff:', error.message)
      this.sendError(client, 'Failed to apply diff')
    }
  }

  @SubscribeMessage('full-sync')
  handleFullSync(@ConnectedSocket() client: Socket): void {
    this.sendFullSync(client)
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong')
  }

  private sendFullSync(client: Socket): void {
    const state = this.collaborationService.getCurrentState()
    client.emit('full-sync', {
      type: 'full-sync',
      data: state,
    })
  }

  private sendError(client: Socket, message: string): void {
    client.emit('error', {
      type: 'error',
      data: { message },
    })
  }
}
