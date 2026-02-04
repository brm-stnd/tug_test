import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  VersionColumn,
  Unique,
} from 'typeorm';
import { Card } from './card.entity';

export enum PeriodType {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
}

@Entity('card_spending_counters')
@Index(['cardId', 'periodType', 'periodKey'])
@Unique(['cardId', 'periodType', 'periodKey'])
export class CardSpendingCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @Column({
    name: 'period_type',
    type: 'enum',
    enum: PeriodType,
  })
  periodType: PeriodType;

  @Column({ name: 'period_key', length: 10 })
  periodKey: string;

  @Column({
    name: 'amount_spent',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  amountSpent: string;

  @Column({ name: 'transaction_count', type: 'int', default: 0 })
  transactionCount: number;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Card, (card) => card.spendingCounters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'card_id' })
  card: Card;
}
