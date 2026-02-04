import { Injectable, Logger } from '@nestjs/common';
import { ProcessTransactionSaga, TransactionSagaData } from '../../saga/sagas/process-transaction.saga';
import { CreateTransactionWebhookDto } from './dto/webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly processTransactionSaga: ProcessTransactionSaga,
  ) {}

  async processTransaction(dto: CreateTransactionWebhookDto, idempotencyKey: string) {
    this.logger.log(`Processing webhook transaction: ${idempotencyKey}`);

    const sagaData: TransactionSagaData = {
      cardNumber: dto.cardNumber,
      amount: dto.amount,
      idempotencyKey,
      externalReference: dto.externalReference,
      stationId: dto.stationId,
      stationName: dto.stationName,
      fuelType: dto.fuelType,
      liters: dto.liters,
    };

    const result = await this.processTransactionSaga.execute(sagaData);

    return {
      transactionId: result.transactionId,
      status: result.status,
      declineReason: result.declineReason,
      amount: result.amount,
      newBalance: result.newBalance,
    };
  }
}
