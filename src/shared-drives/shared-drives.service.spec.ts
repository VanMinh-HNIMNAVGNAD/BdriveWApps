import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SharedDrivesService } from './shared-drives.service';
import { SharedDrive } from '../entities/shared-drive.entity';
import { SharedDriveMember } from '../entities/shared-drive-member.entity';
import { User } from '../entities/user.entity';

describe('SharedDrivesService', () => {
  let service: SharedDrivesService;

  const mockSharedDriveRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((drive) => Promise.resolve({ id: 'drive-123', ...drive })),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockMemberRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((m) => Promise.resolve({ id: 'member-123', ...m })),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharedDrivesService,
        { provide: getRepositoryToken(SharedDrive), useValue: mockSharedDriveRepo },
        { provide: getRepositoryToken(SharedDriveMember), useValue: mockMemberRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<SharedDrivesService>(SharedDrivesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a new Shared Drive and assign creator as ADMIN', async () => {
    const result = await service.create('user-1', { name: 'Engineering Team', description: 'Docs & Assets' });

    expect(mockSharedDriveRepo.create).toHaveBeenCalledWith({
      name: 'Engineering Team',
      description: 'Docs & Assets',
      createdBy: 'user-1',
    });
    expect(mockMemberRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sharedDriveId: 'drive-123',
        userId: 'user-1',
        role: 'ADMIN',
      }),
    );
    expect(result.name).toEqual('Engineering Team');
  });
});
