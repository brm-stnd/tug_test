import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { TransactionsService } from './transactions.service';
import {
  TransactionResponseDto,
  ProcessTransactionDto,
  ProcessTransactionResultDto,
} from './dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a new transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction processed',
    type: ProcessTransactionResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async processTransaction(
    @Body() dto: ProcessTransactionDto,
  ): Promise<ProcessTransactionResultDto> {
    return this.transactionsService.processTransaction({
      ...dto,
      idempotencyKey: dto.idempotencyKey || uuidv4(),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiQuery({
    name: 'cardId',
    required: false,
    type: 'string',
    description: 'Filter by card ID',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    type: 'string',
    description: 'Filter by organization ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Number of transactions to return',
  })
  @ApiResponse({
    status: 200,
    description: 'List of transactions',
    type: [TransactionResponseDto],
  })
  async findAll(
    @Query('cardId') cardId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: number,
  ): Promise<TransactionResponseDto[]> {
    return this.transactionsService.findAll(cardId, organizationId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Transaction details',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.findOne(id);
  }
}
