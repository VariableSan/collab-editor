import { io, Socket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { DiffResult } from '../src/types'
import { CollaborativeWSClient } from '../src/ws-client'

vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}))

describe('CollaborativeWSClient', () => {
  let client: CollaborativeWSClient
  let mockSocket: {
    connected: boolean
    on: Mock
    emit: Mock
    disconnect: Mock
    off: Mock
  }

  beforeEach(() => {
    mockSocket = {
      connected: false,
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      off: vi.fn(),
    }
    ;(io as unknown as Mock).mockReturnValue(mockSocket as unknown as Socket)

    client = new CollaborativeWSClient({
      url: 'ws://localhost:4000',
      namespace: '/collaborate',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should create socket connection with correct parameters', () => {
      client.connect()

      expect(io).toHaveBeenCalledWith('ws://localhost:4000/collaborate', {
        reconnection: true,
        reconnectionDelay: 3000,
        reconnectionAttempts: 5,
        transports: ['websocket'],
      })
    })

    it('should not create duplicate connections', () => {
      mockSocket.connected = true

      client.connect()
      client.connect()

      expect(io).toHaveBeenCalledTimes(1)
    })

    it('should setup event handlers on connect', () => {
      client.connect()

      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      )
      expect(mockSocket.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      )
      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect_error',
        expect.any(Function),
      )
      expect(mockSocket.on).toHaveBeenCalledWith('init', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('diff', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('ack', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should disconnect and cleanup socket', () => {
      client.connect()
      client.disconnect()

      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      client.connect()
    })

    it('should emit connect event when socket connects', () => {
      const connectHandler = vi.fn()
      client.on('connect', connectHandler)

      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect',
      )?.[1]
      connectCallback?.()

      expect(connectHandler).toHaveBeenCalled()
      expect(client.isConnected()).toBe(true)
    })

    it('should emit disconnect event when socket disconnects', () => {
      const disconnectHandler = vi.fn()
      client.on('disconnect', disconnectHandler)

      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect',
      )?.[1]
      disconnectCallback?.('transport close')

      expect(disconnectHandler).toHaveBeenCalledWith('transport close')
      expect(client.isConnected()).toBe(false)
    })

    it('should emit error event on connection error', () => {
      const errorHandler = vi.fn()
      client.on('error', errorHandler)

      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error',
      )?.[1]
      errorCallback?.({ message: 'Connection failed' })

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Connection error: Connection failed',
        }),
      )
    })

    it('should handle init message with text content', () => {
      const textChangeHandler = vi.fn()
      client.on('textChange', textChangeHandler)

      const initCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'init',
      )?.[1]
      initCallback?.({
        data: {
          content: 'Initial text',
          version: 1,
        },
      })

      expect(textChangeHandler).toHaveBeenCalledWith('Initial text')
    })

    it('should handle diff message', () => {
      const diffHandler = vi.fn()
      client.on('diffReceived', diffHandler)

      const diff: DiffResult = {
        operations: [
          { type: 'retain', value: 'Hello ' },
          { type: 'insert', value: 'World' },
        ],
      }

      const diffCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'diff',
      )?.[1]
      diffCallback?.({
        data: {
          diff,
          version: 2,
        },
      })

      expect(diffHandler).toHaveBeenCalledWith(diff)
    })

    it('should handle full-sync message', () => {
      const textChangeHandler = vi.fn()
      client.on('textChange', textChangeHandler)

      const fullSyncCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'full-sync',
      )?.[1]
      fullSyncCallback?.({
        data: {
          content: 'Synced text',
          version: 5,
        },
      })

      expect(textChangeHandler).toHaveBeenCalledWith('Synced text')
    })

    it('should handle ack message and update version', () => {
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect',
      )?.[1]
      connectCallback?.()

      const ackCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'ack',
      )?.[1]
      ackCallback?.({
        data: {
          version: 10,
        },
      })
    })

    it('should emit error on error message', () => {
      const errorHandler = vi.fn()
      client.on('error', errorHandler)

      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error',
      )?.[1]
      errorCallback?.({
        data: {
          message: 'Server error occurred',
        },
      })

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Server error occurred' }),
      )
    })
  })

  describe('Sending Data', () => {
    beforeEach(() => {
      client.connect()

      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect',
      )?.[1]
      connectCallback?.()
    })

    it('should send diff when connected', () => {
      const diff: DiffResult = {
        operations: [
          { type: 'delete', value: 'old' },
          { type: 'insert', value: 'new' },
        ],
      }

      client.sendDiff(diff)

      expect(mockSocket.emit).toHaveBeenCalledWith('diff', {
        id: expect.any(String),
        timestamp: expect.any(Number),
        data: {
          diff,
          version: 0,
        },
      })
    })

    it('should not send diff when disconnected', () => {
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect',
      )?.[1]
      disconnectCallback?.()

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const diff: DiffResult = {
        operations: [{ type: 'insert', value: 'test' }],
      }

      client.sendDiff(diff)

      expect(mockSocket.emit).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith('Not connected to server')

      consoleWarnSpy.mockRestore()
    })

    it('should not request full sync when disconnected', () => {
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect',
      )?.[1]
      disconnectCallback?.()

      client.requestFullSync()

      expect(mockSocket.emit).not.toHaveBeenCalledWith('full-sync')
    })
  })

  describe('ID Generation', () => {
    it('should generate unique IDs for messages', () => {
      client.connect()
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect',
      )?.[1]
      connectCallback?.()

      const diff: DiffResult = { operations: [] }

      client.sendDiff(diff)
      client.sendDiff(diff)

      const calls = mockSocket.emit.mock.calls.filter(
        call => call[0] === 'diff',
      )
      const id1 = calls[0]?.[1]?.id
      const id2 = calls[1]?.[1]?.id

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
    })
  })

  describe('Error Handling', () => {
    it('should handle socket creation errors', () => {
      const error = new Error('Socket creation failed')
      ;(io as unknown as Mock).mockImplementation(() => {
        throw error
      })

      const errorHandler = vi.fn()
      const newClient = new CollaborativeWSClient({
        url: 'ws://localhost:4000',
      })
      newClient.on('error', errorHandler)

      newClient.connect()

      expect(errorHandler).toHaveBeenCalledWith(error)
    })
  })

  describe('Configuration', () => {
    it('should use custom configuration options', () => {
      const customClient = new CollaborativeWSClient({
        url: 'ws://example.com:5000',
        namespace: '/custom',
        reconnectInterval: 1000,
        maxReconnectAttempts: 10,
      })

      customClient.connect()

      expect(io).toHaveBeenCalledWith('ws://example.com:5000/custom', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        transports: ['websocket'],
      })
    })

    it('should use default configuration when not specified', () => {
      const defaultClient = new CollaborativeWSClient({
        url: 'ws://localhost:3000',
      })

      defaultClient.connect()

      expect(io).toHaveBeenCalledWith('ws://localhost:3000/collaborate', {
        reconnection: true,
        reconnectionDelay: 3000,
        reconnectionAttempts: 5,
        transports: ['websocket'],
      })
    })
  })
})
