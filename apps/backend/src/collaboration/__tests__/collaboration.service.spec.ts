import { Test, TestingModule } from '@nestjs/testing'
import { CollaborationService } from '../collaboration.service'
import { DiffService } from '../diff.service'
import { DocumentService } from '../document.service'

describe('CollaborationService', () => {
  let service: CollaborationService
  let documentService: DocumentService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaborationService, DocumentService, DiffService],
    }).compile()

    service = module.get<CollaborationService>(CollaborationService)
    documentService = module.get<DocumentService>(DocumentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should return initial state', () => {
    const state = service.getInitialState()
    expect(state).toHaveProperty('content')
    expect(state).toHaveProperty('version')
    expect(state.version).toBe(0)
  })

  it('should apply diff successfully', () => {
    const diff = {
      operations: [{ type: 'insert', value: 'Hello' }],
    }

    const result = service.applyDiff(diff, 0, 'test-client')

    expect(result.success).toBe(true)
    expect(result.version).toBe(1)
    expect(documentService.getContent()).toBe('Hello')
  })

  it('should handle version mismatch', () => {
    documentService.updateContent('test', 'test')

    const diff = {
      operations: [{ type: 'insert', value: 'Hello' }],
    }

    const result = service.applyDiff(diff, 0, 'test-client')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Version mismatch')
  })
})
