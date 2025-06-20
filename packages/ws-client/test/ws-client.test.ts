import { describe, expect, it } from 'vitest'
import { createWebSocketClient } from '../src/index'
import { DiffLib, DiffResult } from '../src/types'
import { WebSocketClient } from '../src/websocket-client'

describe('createWebSocketClient factory', () => {
  it('should create WebSocketClient instance', () => {
    const mockDiff = getMockDiffInstance()

    const client = createWebSocketClient(
      {
        url: 'ws://localhost:3001',
      },
      mockDiff,
    )

    expect(client).toBeInstanceOf(WebSocketClient)
    client.dispose()
  })

  it('should create client with listeners', () => {
    const mockDiff = getMockDiffInstance()

    const listeners = {
      onConnectionStateChange: () => {},
      onDocumentState: () => {},
    }

    const client = createWebSocketClient(
      { url: 'ws://localhost:3001' },
      mockDiff,
      listeners,
    )

    expect(client).toBeInstanceOf(WebSocketClient)
    client.dispose()
  })
})

describe('exports', () => {
  it('should export WebSocketClient class', () => {
    expect(WebSocketClient).toBeDefined()
    expect(typeof WebSocketClient).toBe('function')
  })

  it('should export factory function', () => {
    expect(createWebSocketClient).toBeDefined()
    expect(typeof createWebSocketClient).toBe('function')
  })
})

class Diff extends DiffLib {
  public calculateDiff(): Promise<DiffResult> {
    return Promise.resolve({
      operations: [],
      oldLength: 0,
      newLength: 0,
    })
  }
  public applyDiff(): Promise<string> {
    return Promise.resolve('')
  }
  public dispose(): void {}
}

function getMockDiffInstance(): DiffLib {
  return new Diff()
}
