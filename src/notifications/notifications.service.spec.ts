import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { SystemNotification } from '../entities/system-notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotificationRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((n) => Promise.resolve({ id: 'notif-1', ...n })),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(SystemNotification), useValue: mockNotificationRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create system notification with default INFO type', async () => {
    const notif = await service.createSystemNotification('user-1', 'Storage Warning', 'Your storage is 80% full');

    expect(mockNotificationRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Storage Warning',
      message: 'Your storage is 80% full',
      type: 'INFO',
      linkUrl: undefined,
      isRead: false,
    });
    expect(notif.title).toEqual('Storage Warning');
  });
});
