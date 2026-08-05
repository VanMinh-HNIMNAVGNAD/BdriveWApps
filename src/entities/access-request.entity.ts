import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { FileItem } from './file-item.entity';

@Entity('access_requests')
export class AccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ name: 'requested_by_user_id' })
  requestedByUserId: string;

  @Column({ name: 'requested_role', length: 20, default: 'VIEWER', nullable: true })
  requestedRole: string;

  @Column({ length: 20, default: 'PENDING', nullable: true })
  status: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => FileItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileItem;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser: User;
}
