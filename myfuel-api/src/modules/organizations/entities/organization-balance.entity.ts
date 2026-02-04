import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('organization_balances')
export class OrganizationBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  currentBalance: string;

  @Column({
    name: 'reserved_balance',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  reservedBalance: string;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Organization, (organization) => organization.balance, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  get availableBalance(): string {
    return (
      parseFloat(this.currentBalance) - parseFloat(this.reservedBalance)
    ).toFixed(2);
  }
}
