import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDiffProvider } from '../src/types'
import { CollaborativeWSClient } from '../src/ws-client'

global.WebSocket = vi.fn() as any

describe('CollaborativeWSClient', () => {
  let mockDiffProvider: IDiffProvider
  let client: CollaborativeWSClient
  let mockWs: any

  beforeEach(() => {
    mockDiffProvider = {
      calculate: vi.fn().mockReturnValue({
        operations: [
          { type: 'retain', value: 'hello' },
          { type: 'insert', value: ' world' },
        ],
      }),
      apply: vi.fn().mockReturnValue('hello world'),
    }

    mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
    }
    ;(global.WebSocket as any).mockImplementation(() => mockWs)

    client = new CollaborativeWSClient({
      url: 'ws://localhost:3000',
      diffProvider: mockDiffProvider,
    })
  })

  it('should create client instance', () => {
    expect(client).toBeDefined()
    expect(client.isConnected()).toBe(false)
  })
})
