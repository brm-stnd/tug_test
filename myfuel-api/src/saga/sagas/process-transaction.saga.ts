import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SagaOrchestrator } from '../saga-orchestrator.service';
import { SagaState, SagaStatus } from '../interfaces';
import { CardsService } from '../../modules/cards/cards.service';
import { OrganizationsService } from '../../modules/organizations/organizations.service';
import {
  Transaction,
  TransactionStatus,
  DeclineReason,
} from '../../modules/transactions/entities/transaction.entity';
import { Card } from '../../modules/cards/entities/card.entity';

export interface TransactionSagaData {
  // Input
  cardNumber: string;
  amount: string;
  idempotencyKey: string;
  externalReference?: string;
  stationId?: string;
  stationName?: string;
  fuelType?: string;
  liters?: string;

  // Populated during execution
  card?: Card;
  organizationId?: string;
  timezone?: string;
  transaction?: Transaction;
  balanceDeducted?: boolean;
  countersUpdated?: boolean;
}

export interface TransactionSagaResult {
  sagaState: SagaState<TransactionSagaData>;
  transactionId?: string;
  status: TransactionStatus;
  declineReason?: DeclineReason;
  amount: string;
  newBalance?: string;
}

@Injectable()
export class ProcessTransactionSaga {
  private readonly logger = new Logger(ProcessTransactionSaga.name);

  constructor(
    private readonly cardsService: CardsService,
    private readonly organizationsService: OrganizationsService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(data: TransactionSagaData): Promise<TransactionSagaResult> {
    const orchestrator = new SagaOrchestrator<TransactionSagaData>();

    // Step 1: Validate Card
    orchestrator.addStep({
      name: 'ValidateCard',
      execute: async (sagaData) => {
        this.logger.log(`Validating card: ${sagaData.cardNumber.slice(-4)}`);

        const card = await this.cardsService.findByCardNumber(
          sagaData.cardNumber,
        );
        sagaData.card = card;
        sagaData.organizationId = card.organizationId;
        sagaData.timezone = card.organization?.timezone || 'UTC';

        const validation = await this.cardsService.validateCardForTransaction(
          card.id,
          sagaData.amount,
          sagaData.timezone,
        );

        if (!validation.valid) {
          throw new Error(validation.reason);
        }
      },
      compensate: async () => {
        // No compensation needed for validation
      },
    });

    // Step 2: Check Balance
    orchestrator.addStep({
      name: 'CheckBalance',
      execute: async (sagaData) => {
        this.logger.log(
          `Checking balance for organization: ${sagaData.organizationId}`,
        );

        if (!sagaData.organizationId) {
          throw new Error('Organization ID not found');
        }

        const hasSufficientBalance =
          await this.organizationsService.hasSufficientBalance(
            sagaData.organizationId,
            sagaData.amount,
          );

        if (!hasSufficientBalance) {
          throw new Error('INSUFFICIENT_BALANCE');
        }
      },
      compensate: async () => {
        // No compensation needed for check
      },
    });

    // Step 3: Deduct Balance (within transaction)
    orchestrator.addStep({
      name: 'DeductBalance',
      execute: async (sagaData) => {
        this.logger.log(
          `Deducting ${sagaData.amount} from organization ${sagaData.organizationId}`,
        );

        if (!sagaData.card || !sagaData.organizationId) {
          throw new Error('Card or organization not found');
        }

        const cardId = sagaData.card.id;
        const orgId = sagaData.organizationId;

        await this.dataSource.transaction(async (manager) => {
          // Create transaction record first
          const transaction = manager.create(Transaction, {
            idempotencyKey: sagaData.idempotencyKey,
            organizationId: orgId,
            cardId: cardId,
            amount: sagaData.amount,
            externalReference: sagaData.externalReference,
            stationId: sagaData.stationId,
            stationName: sagaData.stationName,
            fuelType: sagaData.fuelType,
            liters: sagaData.liters,
            status: TransactionStatus.PENDING,
          });
          sagaData.transaction = await manager.save(transaction);

          // Deduct balance
          await this.organizationsService.deductBalance(
            orgId,
            sagaData.amount,
            sagaData.transaction.id,
            manager,
          );
          sagaData.balanceDeducted = true;
        });
      },
      compensate: async (sagaData) => {
        if (
          sagaData.balanceDeducted &&
          sagaData.transaction &&
          sagaData.organizationId
        ) {
          this.logger.log(
            `Compensating: Refunding ${sagaData.amount} to organization ${sagaData.organizationId}`,
          );

          const transactionId = sagaData.transaction.id;
          const orgId = sagaData.organizationId;

          await this.dataSource.transaction(async (manager) => {
            // Refund balance via top-up
            await this.organizationsService.topUpBalance(orgId, {
              amount: sagaData.amount,
              reference: `REFUND-${transactionId}`,
            });

            // Mark transaction as reversed
            await manager.update(Transaction, transactionId, {
              status: TransactionStatus.REVERSED,
            });
          });
        }
      },
    });

    // Step 4: Update Spending Counters
    orchestrator.addStep({
      name: 'UpdateSpendingCounters',
      execute: async (sagaData) => {
        if (!sagaData.card) {
          throw new Error('Card not found');
        }

        const cardId = sagaData.card.id;
        const timezone = sagaData.timezone || 'UTC';

        this.logger.log(`Updating spending counters for card: ${cardId}`);

        await this.dataSource.transaction(async (manager) => {
          await this.cardsService.updateSpendingCounters(
            cardId,
            sagaData.amount,
            timezone,
            manager,
          );
          sagaData.countersUpdated = true;
        });
      },
      compensate: async (sagaData) => {
        if (sagaData.countersUpdated && sagaData.card) {
          const cardId = sagaData.card.id;
          const timezone = sagaData.timezone || 'UTC';

          this.logger.log(
            `Compensating: Rolling back spending counters for card: ${cardId}`,
          );

          await this.dataSource.transaction(async (manager) => {
            await this.cardsService.rollbackSpendingCounters(
              cardId,
              sagaData.amount,
              timezone,
              manager,
            );
          });
        }
      },
    });

    // Step 5: Approve Transaction
    orchestrator.addStep({
      name: 'ApproveTransaction',
      execute: async (sagaData) => {
        if (!sagaData.transaction) {
          throw new Error('Transaction not found');
        }

        const transactionId = sagaData.transaction.id;
        this.logger.log(`Approving transaction: ${transactionId}`);

        await this.dataSource
          .createQueryBuilder()
          .update(Transaction)
          .set({
            status: TransactionStatus.APPROVED,
            processedAt: new Date(),
          })
          .where('id = :id', { id: transactionId })
          .execute();
      },
      compensate: async () => {
        // Transaction reversal already handled in DeductBalance compensation
      },
    });

    // Execute the saga
    const sagaState = await orchestrator.execute(data);

    // Build result
    if (sagaState.status === SagaStatus.COMPLETED) {
      const balance = await this.organizationsService.getBalance(
        data.organizationId!,
      );
      return {
        sagaState,
        transactionId: data.transaction!.id,
        status: TransactionStatus.APPROVED,
        amount: data.amount,
        newBalance: balance.currentBalance,
      };
    } else {
      // Map error to decline reason
      const declineReason = this.mapErrorToDeclineReason(
        sagaState.error || 'UNKNOWN',
      );
      return {
        sagaState,
        transactionId: data.transaction?.id,
        status: TransactionStatus.DECLINED,
        declineReason,
        amount: data.amount,
      };
    }
  }

  private mapErrorToDeclineReason(error: string): DeclineReason {
    const mapping: Record<string, DeclineReason> = {
      CARD_INACTIVE: DeclineReason.CARD_INACTIVE,
      CARD_EXPIRED: DeclineReason.CARD_INACTIVE,
      CARD_NOT_FOUND: DeclineReason.CARD_NOT_FOUND,
      DAILY_LIMIT_EXCEEDED: DeclineReason.DAILY_LIMIT_EXCEEDED,
      MONTHLY_LIMIT_EXCEEDED: DeclineReason.MONTHLY_LIMIT_EXCEEDED,
      INSUFFICIENT_BALANCE: DeclineReason.INSUFFICIENT_BALANCE,
      ORGANIZATION_SUSPENDED: DeclineReason.ORGANIZATION_SUSPENDED,
    };
    return mapping[error] || DeclineReason.CARD_INACTIVE;
  }
}
