import {
  DiffLib,
  WebSocketClientConfig,
  WebSocketEventListeners,
} from './types'
import { WebSocketClient } from './websocket-client'

export function createWebSocketClient(
  config: WebSocketClientConfig,
  diffLib: DiffLib,
  listeners?: WebSocketEventListeners,
): WebSocketClient {
  return new WebSocketClient(config, diffLib, listeners)
}
