import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { StoragePlan } from './storage-plan.entity';

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({ length: 20, default: 'ACTIVE', nullable: true })
  status: string;

  @Column({ name: 'billing_cycle', length: 10, default: 'monthly', nullable: true })
  billingCycle: string;

  @CreateDateColumn({ name: 'start_date', type: 'timestamp with time zone' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp with time zone' })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => StoragePlan)
  @JoinColumn({ name: 'plan_id' })
  plan: StoragePlan;
}
