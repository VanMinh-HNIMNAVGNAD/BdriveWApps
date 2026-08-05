import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validateConfig } from './config/validate-config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { StorageModule } from './storage/storage.module';
import { CommonModule } from './common/common.module';
import { SharedDrivesModule } from './shared-drives/shared-drives.module';
import { TagsModule } from './tags/tags.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FileVersionsModule } from './file-versions/file-versions.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { FileItem } from './entities/file-item.entity';
import { StoragePlan } from './entities/storage-plan.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { SharedDrive } from './entities/shared-drive.entity';
import { SystemNotification } from './entities/system-notification.entity';
import { Tag } from './entities/tag.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SharedDriveMember } from './entities/shared-drive-member.entity';
import { AccessRequest } from './entities/access-request.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { FileShare } from './entities/file-share.entity';
import { FileTag } from './entities/file-tag.entity';
import { FileVersion } from './entities/file-version.entity';

import { ScheduleModule } from '@nestjs/schedule';

const rootEnvPath = path.resolve(__dirname, '../../.env');
console.log(`[ConfigModule] Loaded environment file from: ${rootEnvPath}`);

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: rootEnvPath,
      load: [configuration],
      validate: validateConfig,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host') || configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('database.port') || configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('database.username') || configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('database.password') ?? configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('database.database') || configService.get<string>('DB_DATABASE', 'driver_db'),
        entities: [
          User,
          UserSession,
          FileItem,
          StoragePlan,
          PaymentTransaction,
          SharedDrive,
          SystemNotification,
          Tag,
          UserSubscription,
          SharedDriveMember,
          AccessRequest,
          ActivityLog,
          FileShare,
          FileTag,
          FileVersion,
        ],
        synchronize: false,
      }),
    }),
    AuthModule,
    FilesModule,
    StorageModule,
    CommonModule,
    SharedDrivesModule,
    TagsModule,
    NotificationsModule,
    FileVersionsModule,
    AdminModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
