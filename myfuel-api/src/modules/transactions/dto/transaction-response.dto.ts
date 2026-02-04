import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, DeclineReason } from '../entities/transaction.entity';

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  idempotencyKey: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  cardId: string;

  @ApiPropertyOptional()
  externalReference?: string;

  @ApiPropertyOptional()
  stationId?: string;

  @ApiPropertyOptional()
  stationName?: string;

  @ApiProperty()
  amount: string;

  @ApiPropertyOptional()
  fuelType?: string;

  @ApiPropertyOptional()
  liters?: string;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiPropertyOptional({ enum: DeclineReason })
  declineReason?: DeclineReason;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
