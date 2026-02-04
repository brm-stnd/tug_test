import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  Organization,
  OrganizationStatus,
} from './entities/organization.entity';
import { OrganizationBalance } from './entities/organization-balance.entity';
import {
  BalanceLedger,
  LedgerEntryType,
} from './entities/balance-ledger.entity';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  TopUpBalanceDto,
} from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationBalance)
    private readonly balanceRepository: Repository<OrganizationBalance>,
    @InjectRepository(BalanceLedger)
    private readonly ledgerRepository: Repository<BalanceLedger>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    return this.dataSource.transaction(async (manager) => {
      const organization = manager.create(Organization, {
        name: dto.name,
        timezone: dto.timezone,
        status: OrganizationStatus.ACTIVE,
      });

      const savedOrg = await manager.save(organization);

      const balance = manager.create(OrganizationBalance, {
        organizationId: savedOrg.id,
        currentBalance: dto.initialBalance || '0',
        reservedBalance: '0',
        currency: dto.currency || 'USD',
      });

      const savedBalance = await manager.save(balance);

      // Create initial ledger entry if there's an initial balance
      if (dto.initialBalance && parseFloat(dto.initialBalance) > 0) {
        const ledgerEntry = manager.create(BalanceLedger, {
          organizationId: savedOrg.id,
          entryType: LedgerEntryType.CREDIT,
          amount: dto.initialBalance,
          balanceBefore: '0',
          balanceAfter: dto.initialBalance,
          referenceType: 'INITIAL_BALANCE',
          referenceId: savedOrg.id,
        });
        await manager.save(ledgerEntry);
      }

      this.logger.log(`Created organization: ${savedOrg.id}`);

      // Return the saved org with balance attached (within transaction)
      savedOrg.balance = savedBalance;
      return savedOrg;
    });
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: ['balance'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['balance'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);

    Object.assign(organization, dto);
    await this.organizationRepository.save(organization);

    return this.findOne(id);
  }

  async topUpBalance(
    id: string,
    dto: TopUpBalanceDto,
  ): Promise<OrganizationBalance> {
    return this.dataSource.transaction(async (manager) => {
      const balance = await manager.findOne(OrganizationBalance, {
        where: { organizationId: id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balance) {
        throw new NotFoundException(`Balance for organization ${id} not found`);
      }

      const balanceBefore = balance.currentBalance;
      const newBalance = (
        parseFloat(balance.currentBalance) + parseFloat(dto.amount)
      ).toFixed(2);

      balance.currentBalance = newBalance;
      await manager.save(balance);

      // Create ledger entry
      const ledgerEntry = manager.create(BalanceLedger, {
        organizationId: id,
        entryType: LedgerEntryType.CREDIT,
        amount: dto.amount,
        balanceBefore,
        balanceAfter: newBalance,
        referenceType: 'TOP_UP',
        referenceId: dto.reference || uuidv4(),
      });
      await manager.save(ledgerEntry);

      this.logger.log(
        `Topped up organization ${id} balance by ${dto.amount}. New balance: ${newBalance}`,
      );

      return balance;
    });
  }

  async getBalance(id: string): Promise<OrganizationBalance> {
    const balance = await this.balanceRepository.findOne({
      where: { organizationId: id },
    });

    if (!balance) {
      throw new NotFoundException(`Balance for organization ${id} not found`);
    }

    return balance;
  }

  async getLedger(id: string, limit = 100): Promise<BalanceLedger[]> {
    return this.ledgerRepository.find({
      where: { organizationId: id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Deduct balance for a transaction (called within a transaction context)
   */
  async deductBalance(
    organizationId: string,
    amount: string,
    transactionId: string,
    manager: EntityManager,
  ): Promise<void> {
    const balance = await manager.findOne(OrganizationBalance, {
      where: { organizationId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!balance) {
      throw new NotFoundException(
        `Balance for organization ${organizationId} not found`,
      );
    }

    const available =
      parseFloat(balance.currentBalance) - parseFloat(balance.reservedBalance);
    if (available < parseFloat(amount)) {
      throw new ConflictException('Insufficient balance');
    }

    const balanceBefore = balance.currentBalance;
    const newBalance = (
      parseFloat(balance.currentBalance) - parseFloat(amount)
    ).toFixed(2);
    balance.currentBalance = newBalance;
    await manager.save(balance);

    const ledgerEntry = manager.create(BalanceLedger, {
      organizationId,
      transactionId,
      entryType: LedgerEntryType.DEBIT,
      amount,
      balanceBefore,
      balanceAfter: newBalance,
      referenceType: 'TRANSACTION',
      referenceId: transactionId,
    });
    await manager.save(ledgerEntry);
  }

  /**
   * Check if organization has sufficient balance
   */
  async hasSufficientBalance(
    organizationId: string,
    amount: string,
  ): Promise<boolean> {
    const balance = await this.getBalance(organizationId);
    const available =
      parseFloat(balance.currentBalance) - parseFloat(balance.reservedBalance);
    return available >= parseFloat(amount);
  }
}
