import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProcessTransactionSaga,
  TransactionSagaData,
} from '../../saga/sagas/process-transaction.saga';
import { CreateTransactionWebhookDto } from './dto/webhook.dto';
import {
  WebhookEvent,
  WebhookEventStatus,
} from './entities/webhook-event.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepository: Repository<WebhookEvent>,
    private readonly processTransactionSaga: ProcessTransactionSaga,
  ) {}

  async processTransaction(
    dto: CreateTransactionWebhookDto,
    idempotencyKey: string,
  ) {
    this.logger.log(`Processing webhook transaction: ${idempotencyKey}`);

    // Check if webhook event already exists (idempotency)
    const existingEvent = await this.webhookEventRepository.findOne({
      where: { idempotencyKey },
    });

    if (existingEvent) {
      this.logger.log(`Webhook event already exists: ${idempotencyKey}`);
      return {
        transactionId: existingEvent.transactionId,
        status:
          existingEvent.status === WebhookEventStatus.PROCESSED
            ? 'APPROVED'
            : 'DECLINED',
        amount: dto.amount,
        message: 'Duplicate webhook event',
      };
    }

    // Create webhook event record
    const webhookEvent = this.webhookEventRepository.create({
      idempotencyKey,
      eventType: 'TRANSACTION',
      payload: dto as unknown as Record<string, unknown>,
      status: WebhookEventStatus.PROCESSING,
      attempts: 1,
    });
    await this.webhookEventRepository.save(webhookEvent);

    try {
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

      // Update webhook event with result
      webhookEvent.status =
        result.status === 'APPROVED'
          ? WebhookEventStatus.PROCESSED
          : WebhookEventStatus.FAILED;
      webhookEvent.transactionId = result.transactionId ?? '';
      webhookEvent.processedAt = new Date();
      await this.webhookEventRepository.save(webhookEvent);

      return {
        transactionId: result.transactionId,
        status: result.status,
        declineReason: result.declineReason,
        amount: result.amount,
        newBalance: result.newBalance,
      };
    } catch (error) {
      // Update webhook event with error
      webhookEvent.status = WebhookEventStatus.FAILED;
      webhookEvent.lastError = error.message;
      webhookEvent.attempts += 1;
      await this.webhookEventRepository.save(webhookEvent);

      throw error;
    }
  }
}
