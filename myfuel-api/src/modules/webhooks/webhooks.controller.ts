import {
  Controller,
  Post,
  Body,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateTransactionWebhookDto } from './dto/webhook.dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('transaction')
  @ApiOperation({ summary: 'Process a fuel transaction from petrol station' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Unique key to prevent duplicate transactions',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async processTransaction(
    @Body() dto: CreateTransactionWebhookDto,
    @Headers('X-Idempotency-Key') idempotencyKey?: string,
  ) {
    const key = idempotencyKey || uuidv4();
    return this.webhooksService.processTransaction(dto, key);
  }
}
