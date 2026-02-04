import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';
import { CardStatus } from '../entities/card.entity';

export class CreateCardDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'Card number',
    example: '1234567890123456',
    minLength: 10,
    maxLength: 19,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(19)
  cardNumber: string;

  @ApiPropertyOptional({
    description: 'Card holder name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  holderName?: string;

  @ApiPropertyOptional({
    description: 'Daily spending limit',
    example: '500.00',
    default: '500.00',
  })
  @IsOptional()
  @IsString()
  dailyLimit?: string = '500.00';

  @ApiPropertyOptional({
    description: 'Monthly spending limit',
    example: '5000.00',
    default: '5000.00',
  })
  @IsOptional()
  @IsString()
  monthlyLimit?: string = '5000.00';

  @ApiPropertyOptional({
    description: 'Card expiry date',
    example: '2027-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class UpdateCardDto {
  @ApiPropertyOptional({
    description: 'Card status',
    enum: CardStatus,
  })
  @IsOptional()
  @IsEnum(CardStatus)
  status?: CardStatus;

  @ApiPropertyOptional({
    description: 'Card holder name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  holderName?: string;

  @ApiPropertyOptional({
    description: 'Daily spending limit',
    example: '500.00',
  })
  @IsOptional()
  @IsString()
  dailyLimit?: string;

  @ApiPropertyOptional({
    description: 'Monthly spending limit',
    example: '5000.00',
  })
  @IsOptional()
  @IsString()
  monthlyLimit?: string;

  @ApiPropertyOptional({
    description: 'Card expiry date',
    example: '2027-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
