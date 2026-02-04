import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrganizationStatus } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Logistics Inc.',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Timezone for limit calculations',
    example: 'America/New_York',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string = 'UTC';

  @ApiPropertyOptional({
    description: 'Initial balance amount',
    example: '10000.00',
    default: '0',
  })
  @IsOptional()
  @IsString()
  initialBalance?: string = '0';

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'USD';
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'Acme Logistics Inc.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Organization status',
    enum: OrganizationStatus,
  })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiPropertyOptional({
    description: 'Timezone for limit calculations',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

export class TopUpBalanceDto {
  @ApiProperty({
    description: 'Amount to add to balance',
    example: '5000.00',
  })
  @IsString()
  amount: string;

  @ApiPropertyOptional({
    description: 'Reference for this top-up',
    example: 'INV-2026-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}
