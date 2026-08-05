import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { StoragePlan } from './storage-plan.entity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'plan_id', nullable: true })
  planId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 0 })
  amount: number;

  @Column({ name: 'payment_method', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'transaction_code', length: 100, unique: true, nullable: true })
  transactionCode: string;

  @Column({ length: 20, default: 'PENDING', nullable: true })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => StoragePlan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: StoragePlan;
}
