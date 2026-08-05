import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { FileItem } from './file-item.entity';

@Entity('file_shares')
@Index('idx_file_shares_token', ['shareToken'])
@Index('idx_file_shares_user', ['sharedWithUserId'])
export class FileShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ name: 'shared_with_user_id', nullable: true })
  sharedWithUserId: string | null;

  @Column({ length: 20 })
  role: string;

  @Column({ name: 'access_level', length: 20, default: 'RESTRICTED', nullable: true })
  accessLevel: string;

  @Column({ name: 'share_token', length: 64, unique: true, nullable: true })
  shareToken: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'is_download_allowed', default: true })
  isDownloadAllowed: boolean;

  @Column({ name: 'is_preview_only', default: false })
  isPreviewOnly: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => FileItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileItem;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'shared_with_user_id' })
  sharedWithUser: User;
}
