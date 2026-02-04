import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { CardSpendingCounter } from './card-spending-counter.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum CardStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

@Entity('cards')
@Index(['cardNumberHash'])
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'card_number', length: 255 })
  cardNumber: string;

  @Column({ name: 'card_number_hash', length: 64 })
  cardNumberHash: string;

  @Column({
    type: 'enum',
    enum: CardStatus,
    default: CardStatus.ACTIVE,
  })
  status: CardStatus;

  @Column({
    name: 'daily_limit',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 500,
  })
  dailyLimit: string;

  @Column({
    name: 'monthly_limit',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 5000,
  })
  monthlyLimit: string;

  @Column({ name: 'holder_name', length: 255, nullable: true })
  holderName: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Organization, (organization) => organization.cards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => CardSpendingCounter, (counter) => counter.card)
  spendingCounters: CardSpendingCounter[];

  @OneToMany(() => Transaction, (transaction) => transaction.card)
  transactions: Transaction[];
}
