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
import { UpdateMessage } from './collaboration.model'
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

    // Отправляем начальное состояние
    client.emit('init', {
      type: 'init',
      data: initData,
    })
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('update')
  handleUpdate(
    @MessageBody() message: UpdateMessage,
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      this.logger.log(`Received update from ${client.id}`)

      // Просто обновляем состояние и рассылаем всем
      const newVersion = this.collaborationService.updateContent(
        message.data.content,
        client.id,
      )

      // Подтверждение отправителю
      client.emit('ack', {
        type: 'ack',
        id: message.id,
        data: {
          version: newVersion,
          timestamp: message.timestamp,
        },
      })

      // Рассылаем всем остальным
      client.broadcast.emit('update', {
        type: 'update',
        data: {
          content: message.data.content,
          version: newVersion,
        },
      })
    } catch (error) {
      this.logger.error('Error handling update:', error.message)
      this.sendError(client, 'Failed to update content')
    }
  }

  @SubscribeMessage('full-sync')
  handleFullSync(@ConnectedSocket() client: Socket): void {
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
