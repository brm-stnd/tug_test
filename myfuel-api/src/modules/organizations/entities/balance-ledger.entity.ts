import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum LedgerEntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
}

@Entity('balance_ledger')
@Index(['organizationId', 'createdAt'])
export class BalanceLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Column({
    name: 'entry_type',
    type: 'enum',
    enum: LedgerEntryType,
  })
  entryType: LedgerEntryType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ name: 'balance_before', type: 'decimal', precision: 18, scale: 2 })
  balanceBefore: string;

  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 2 })
  balanceAfter: string;

  @Column({ name: 'reference_type', length: 50 })
  referenceType: string;

  @Column({ name: 'reference_id' })
  referenceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;
}
