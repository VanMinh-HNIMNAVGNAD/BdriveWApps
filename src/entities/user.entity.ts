import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserSession } from './user-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ default: 'local' })
  provider: string;

  @Column({ name: 'provider_id', nullable: true })
  providerId: string;

  @Column({ name: 'storage_used_bytes', type: 'bigint', default: 0 })
  storageUsedBytes: number;

  @Column({ name: 'storage_limit_bytes', type: 'bigint', default: 2147483648 }) // 2GB default
  storageLimitBytes: number;

  @Column({ default: 'USER' })
  role: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp with time zone', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'is_hibernated', default: false })
  isHibernated: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];
}
