import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TagsService } from './tags.service';
import { Tag } from '../entities/tag.entity';
import { FileTag } from '../entities/file-tag.entity';
import { FileItem } from '../entities/file-item.entity';

describe('TagsService', () => {
  let service: TagsService;

  const mockTagRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((tag) => Promise.resolve({ id: 'tag-1', ...tag })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockFileTagRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((ft) => Promise.resolve({ id: 'ft-1', ...ft })),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFileRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: getRepositoryToken(Tag), useValue: mockTagRepo },
        { provide: getRepositoryToken(FileTag), useValue: mockFileTagRepo },
        { provide: getRepositoryToken(FileItem), useValue: mockFileRepo },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a new Tag with default Hex color if not provided', async () => {
    mockTagRepo.findOne.mockResolvedValue(null);

    const result = await service.create('user-1', { name: 'Important' });

    expect(mockTagRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Important',
      colorHex: '#3B82F6',
    });
    expect(result.name).toEqual('Important');
  });
});
