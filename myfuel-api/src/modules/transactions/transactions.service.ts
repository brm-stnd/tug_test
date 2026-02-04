import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  DeclineReason,
} from './entities/transaction.entity';
import { CardsService } from '../cards/cards.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { Card } from '../cards/entities/card.entity';

export interface ProcessTransactionData {
  cardNumber: string;
  amount: string;
  idempotencyKey: string;
  externalReference?: string;
  stationId?: string;
  stationName?: string;
  fuelType?: string;
  liters?: string;
}

export interface TransactionResult {
  transactionId: string;
  status: TransactionStatus;
  declineReason?: DeclineReason;
  amount: string;
  newBalance?: string;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly cardsService: CardsService,
    private readonly organizationsService: OrganizationsService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    cardId?: string,
    organizationId?: string,
    limit = 100,
  ): Promise<Transaction[]> {
    const where: Record<string, unknown> = {};
    if (cardId) where.cardId = cardId;
    if (organizationId) where.organizationId = organizationId;

    return this.transactionRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['card', 'organization'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { idempotencyKey: key },
    });
  }

  /**
   * Process a transaction with full validation and atomic updates
   */
  async processTransaction(data: ProcessTransactionData): Promise<TransactionResult> {
    // Check idempotency
    const existing = await this.findByIdempotencyKey(data.idempotencyKey);
    if (existing) {
      this.logger.log(`Transaction already processed: ${data.idempotencyKey}`);
      return {
        transactionId: existing.id,
        status: existing.status,
        declineReason: existing.declineReason,
        amount: existing.amount,
      };
    }

    // Find card
    let card: Card;
    try {
      card = await this.cardsService.findByCardNumber(data.cardNumber);
    } catch (error) {
      // Create declined transaction record
      const transaction = await this.createDeclinedTransaction(
        data,
        null,
        null,
        DeclineReason.CARD_NOT_FOUND,
      );
      return {
        transactionId: transaction.id,
        status: TransactionStatus.DECLINED,
        declineReason: DeclineReason.CARD_NOT_FOUND,
        amount: data.amount,
      };
    }

    const organization = card.organization;
    const timezone = organization.timezone || 'UTC';

    // Execute transaction atomically
    return this.dataSource.transaction(async (manager) => {
      // Step 1: Validate card status and limits
      const cardValidation = await this.cardsService.validateCardForTransaction(
        card.id,
        data.amount,
        timezone,
      );

      if (!cardValidation.valid) {
        const declineReason = this.mapDeclineReason(cardValidation.reason || 'UNKNOWN');
        const transaction = await this.createDeclinedTransaction(
          data,
          organization.id,
          card.id,
          declineReason,
        );
        return {
          transactionId: transaction.id,
          status: TransactionStatus.DECLINED,
          declineReason,
          amount: data.amount,
        };
      }

      // Step 2: Check organization balance
      const hasSufficientBalance = await this.organizationsService.hasSufficientBalance(
        organization.id,
        data.amount,
      );

      if (!hasSufficientBalance) {
        const transaction = await this.createDeclinedTransaction(
          data,
          organization.id,
          card.id,
          DeclineReason.INSUFFICIENT_BALANCE,
        );
        return {
          transactionId: transaction.id,
          status: TransactionStatus.DECLINED,
          declineReason: DeclineReason.INSUFFICIENT_BALANCE,
          amount: data.amount,
        };
      }

      // Step 3: Create approved transaction
      const transaction = manager.create(Transaction, {
        idempotencyKey: data.idempotencyKey,
        organizationId: organization.id,
        cardId: card.id,
        amount: data.amount,
        externalReference: data.externalReference,
        stationId: data.stationId,
        stationName: data.stationName,
        fuelType: data.fuelType,
        liters: data.liters,
        status: TransactionStatus.APPROVED,
        processedAt: new Date(),
      });
      const savedTransaction = await manager.save(transaction);

      // Step 4: Deduct organization balance
      await this.organizationsService.deductBalance(
        organization.id,
        data.amount,
        savedTransaction.id,
        manager,
      );

      // Step 5: Update spending counters
      await this.cardsService.updateSpendingCounters(
        card.id,
        data.amount,
        timezone,
        manager,
      );

      // Get updated balance
      const updatedBalance = await this.organizationsService.getBalance(organization.id);

      this.logger.log(
        `Transaction approved: ${savedTransaction.id} - Amount: ${data.amount}`,
      );

      return {
        transactionId: savedTransaction.id,
        status: TransactionStatus.APPROVED,
        amount: data.amount,
        newBalance: updatedBalance.currentBalance,
      };
    });
  }

  private async createDeclinedTransaction(
    data: ProcessTransactionData,
    organizationId: string | null,
    cardId: string | null,
    declineReason: DeclineReason,
  ): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      idempotencyKey: data.idempotencyKey,
      organizationId: organizationId || '00000000-0000-0000-0000-000000000000',
      cardId: cardId || '00000000-0000-0000-0000-000000000000',
      amount: data.amount,
      externalReference: data.externalReference,
      stationId: data.stationId,
      stationName: data.stationName,
      fuelType: data.fuelType,
      liters: data.liters,
      status: TransactionStatus.DECLINED,
      declineReason,
      processedAt: new Date(),
    });

    const saved = await this.transactionRepository.save(transaction);
    this.logger.log(`Transaction declined: ${saved.id} - Reason: ${declineReason}`);
    return saved;
  }

  private mapDeclineReason(reason: string): DeclineReason {
    const mapping: Record<string, DeclineReason> = {
      CARD_INACTIVE: DeclineReason.CARD_INACTIVE,
      CARD_EXPIRED: DeclineReason.CARD_INACTIVE,
      DAILY_LIMIT_EXCEEDED: DeclineReason.DAILY_LIMIT_EXCEEDED,
      MONTHLY_LIMIT_EXCEEDED: DeclineReason.MONTHLY_LIMIT_EXCEEDED,
    };
    return mapping[reason] || DeclineReason.CARD_INACTIVE;
  }
}
