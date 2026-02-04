import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumberString,
} from 'class-validator';

export class ProcessTransactionDto {
  @ApiProperty({ description: 'Card number (16 digits)' })
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional({ description: 'Petrol station ID' })
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiPropertyOptional({ description: 'Petrol station name' })
  @IsOptional()
  @IsString()
  stationName?: string;

  @ApiPropertyOptional({ description: 'Fuel type' })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({ description: 'Liters of fuel' })
  @IsOptional()
  @IsNumberString()
  liters?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key for duplicate prevention',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ProcessTransactionResultDto {
  @ApiProperty()
  transactionId: string;

  @ApiProperty({ enum: ['APPROVED', 'DECLINED', 'PENDING'] })
  status: string;

  @ApiPropertyOptional()
  declineReason?: string;

  @ApiProperty()
  amount: string;

  @ApiPropertyOptional()
  newBalance?: string;
}
