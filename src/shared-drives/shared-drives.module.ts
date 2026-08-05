import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedDrive } from '../entities/shared-drive.entity';
import { SharedDriveMember } from '../entities/shared-drive-member.entity';
import { User } from '../entities/user.entity';
import { SharedDrivesService } from './shared-drives.service';
import { SharedDrivesController } from './shared-drives.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SharedDrive, SharedDriveMember, User])],
  controllers: [SharedDrivesController],
  providers: [SharedDrivesService],
  exports: [SharedDrivesService],
})
export class SharedDrivesModule {}
