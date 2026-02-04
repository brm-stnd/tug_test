import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Card } from '../../cards/entities/card.entity';

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  REVERSED = 'REVERSED',
}

export enum DeclineReason {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  MONTHLY_LIMIT_EXCEEDED = 'MONTHLY_LIMIT_EXCEEDED',
  CARD_INACTIVE = 'CARD_INACTIVE',
  CARD_NOT_FOUND = 'CARD_NOT_FOUND',
  ORGANIZATION_SUSPENDED = 'ORGANIZATION_SUSPENDED',
}

@Entity('transactions')
@Index(['cardId', 'createdAt'])
@Index(['organizationId', 'createdAt'])
@Index(['idempotencyKey'], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'idempotency_key', length: 255 })
  idempotencyKey: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @Column({ name: 'external_reference', length: 255, nullable: true })
  externalReference: string;

  @Column({ name: 'station_id', length: 100, nullable: true })
  stationId: string;

  @Column({ name: 'station_name', length: 255, nullable: true })
  stationName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ name: 'fuel_type', length: 50, nullable: true })
  fuelType: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  liters: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    name: 'decline_reason',
    type: 'enum',
    enum: DeclineReason,
    nullable: true,
  })
  declineReason: DeclineReason;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Card, (card) => card.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;
}
