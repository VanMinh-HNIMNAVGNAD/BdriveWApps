import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('files')
export class FileItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: string; // 'file' | 'folder'

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ name: 'storage_provider', default: 'cloudflare_r2' })
  storageProvider: string;

  @Column({ name: 'storage_tier', default: 'HOT' })
  storageTier: string; // 'HOT' | 'COLD'

  @Column({ name: 'storage_key', nullable: true })
  storageKey: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @Column({ default: '/' })
  path: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'shared_drive_id', nullable: true })
  sharedDriveId: string;

  @Column({ name: 'is_starred', default: false })
  isStarred: boolean;

  @Column({ name: 'is_spam', default: false })
  isSpam: boolean;

  @Column({ name: 'suspicious_reason', nullable: true })
  suspiciousReason: string;

  @Column({ name: 'is_trash', default: false })
  isTrash: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt: Date;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'access_count', default: 0 })
  accessCount: number;

  @Column({ name: 'last_accessed_at', type: 'timestamp with time zone', nullable: true })
  lastAccessedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @ManyToOne(() => FileItem, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: FileItem;
}
