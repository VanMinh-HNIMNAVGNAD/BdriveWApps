import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileItem } from './file-item.entity';

@Entity('file_versions')
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ type: 'int', default: 1 })
  versionNumber: number;

  @Column()
  storageKey: string;

  @Column()
  storageProvider: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ nullable: true })
  mimeType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => FileItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileItem;
}
