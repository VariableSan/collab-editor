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
import { Server } from 'ws'
import { CollaborationService } from './collaboration.service'

interface WSClient extends WebSocket {
  id: string
  isAlive: boolean
}

@WebSocketGateway({
  path: '/collaborate',
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
  private clients = new Map<string, WSClient>()

  constructor(private readonly collaborationService: CollaborationService) {
    // Heartbeat to check connections
    setInterval(() => {
      this.clients.forEach((client: any) => {
        if (!client.isAlive) {
          client.terminate()
          return
        }
        client.isAlive = false
        client.ping()
      })
    }, 30000)
  }

  handleConnection(client: WSClient): void {
    client.id = this.generateClientId()
    client.isAlive = true

    this.clients.set(client.id, client)
    this.logger.log(`Client connected: ${client.id}`)

    const initData = this.collaborationService.getInitialState()
    this.sendToClient(client, {
      type: 'init',
      data: initData,
    })
    ;(client as any)?.on('pong', () => {
      client.isAlive = true
    })
  }

  handleDisconnect(client: WSClient): void {
    this.logger.log(`Client disconnected: ${client.id}`)
    this.clients.delete(client.id)
  }

  @SubscribeMessage('diff')
  handleDiff(
    @MessageBody() data: any,
    @ConnectedSocket() client: WSClient,
  ): void {
    try {
      const result = this.collaborationService.applyDiff(
        data.data.diff,
        data.data.version,
        client.id,
      )

      if (result.success) {
        this.sendToClient(client, {
          type: 'ack',
          id: data.id,
          data: {
            version: result.version,
            timestamp: data.timestamp,
          },
        })

        this.broadcastDiff(client.id, {
          type: 'diff',
          data: {
            diff: data.data.diff,
            version: result.version,
          },
        })
      } else {
        this.sendFullSync(client)
      }
    } catch (error) {
      this.logger.error(`Error applying diff: ${error.message}`)
      this.sendError(client, 'Failed to apply diff')
    }
  }

  @SubscribeMessage('full-sync')
  handleFullSync(@ConnectedSocket() client: WSClient): void {
    this.sendFullSync(client)
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: WSClient): void {
    this.sendToClient(client, { type: 'pong' })
  }

  private sendToClient(client: WSClient, message: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  }

  private broadcastDiff(excludeClientId: string, message: any): void {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        this.sendToClient(client, message)
      }
    })
  }

  private sendFullSync(client: WSClient): void {
    const state = this.collaborationService.getCurrentState()
    this.sendToClient(client, {
      type: 'full-sync',
      data: state,
    })
  }

  private sendError(client: WSClient, message: string): void {
    this.sendToClient(client, {
      type: 'error',
      data: { message },
    })
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
