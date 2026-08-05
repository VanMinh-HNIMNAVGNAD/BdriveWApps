import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('storage_plans')
export class StoragePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ name: 'storage_bytes', type: 'bigint' })
  storageBytes: number;

  @Column({ name: 'price_monthly', type: 'numeric', precision: 12, scale: 0 })
  priceMonthly: number;

  @Column({ name: 'price_yearly', type: 'numeric', precision: 12, scale: 0 })
  priceYearly: number;

  @Column({ name: 'is_active', default: true, nullable: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
