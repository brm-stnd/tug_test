import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, retry } from 'rxjs';

export interface MessagePayload<T = unknown> {
  pattern: string;
  data: T;
  timestamp: Date;
  correlationId?: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(@Inject('MYFUEL_SERVICE') private readonly client: ClientProxy) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.warn(
        `Failed to connect to RabbitMQ: ${error.message}. Running in degraded mode.`,
      );
    }
  }

  /**
   * Send a message and wait for response (RPC pattern)
   */
  async send<TResult = unknown, TInput = unknown>(
    pattern: string,
    data: TInput,
  ): Promise<TResult> {
    this.logger.debug(`Sending message: ${pattern}`);

    const result$ = this.client
      .send<TResult, TInput>(pattern, data)
      .pipe(timeout(30000), retry({ count: 3, delay: 1000 }));

    return lastValueFrom(result$);
  }

  /**
   * Emit an event (fire and forget)
   */
  emit<TInput = unknown>(pattern: string, data: TInput): void {
    this.logger.debug(`Emitting event: ${pattern}`);
    this.client.emit(pattern, data);
  }

  /**
   * Emit a transaction event
   */
  emitTransactionEvent(
    eventType: 'created' | 'approved' | 'declined' | 'reversed',
    transactionData: {
      transactionId: string;
      cardId: string;
      organizationId: string;
      amount: string;
      status: string;
      declineReason?: string;
    },
  ): void {
    const pattern = `transaction.${eventType}`;
    this.emit(pattern, {
      ...transactionData,
      eventType,
      timestamp: new Date().toISOString(),
    });
  }
}
