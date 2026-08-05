import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { SharedDrive } from './shared-drive.entity';

@Entity('shared_drive_members')
@Unique(['sharedDriveId', 'userId'])
export class SharedDriveMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shared_drive_id' })
  sharedDriveId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 20, default: 'MEMBER', nullable: true })
  role: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => SharedDrive, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_drive_id' })
  sharedDrive: SharedDrive;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
