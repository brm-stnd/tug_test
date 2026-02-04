import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateTransactionWebhookDto {
  @ApiProperty({
    description: 'Card number used for the transaction',
    example: '1234567890123456',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(19)
  cardNumber: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: '50.00',
  })
  @IsString()
  amount: string;

  @ApiPropertyOptional({
    description: 'External reference from petrol station',
    example: 'TXN-2026-001234',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalReference?: string;

  @ApiPropertyOptional({
    description: 'Petrol station ID',
    example: 'STATION-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stationId?: string;

  @ApiPropertyOptional({
    description: 'Petrol station name',
    example: 'Shell Main Street',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stationName?: string;

  @ApiPropertyOptional({
    description: 'Type of fuel',
    example: 'DIESEL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fuelType?: string;

  @ApiPropertyOptional({
    description: 'Liters of fuel',
    example: '45.5',
  })
  @IsOptional()
  @IsString()
  liters?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate processing',
    example: 'unique-transaction-id-123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
