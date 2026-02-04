import { ApiProperty } from '@nestjs/swagger';
import { OrganizationStatus } from '../entities/organization.entity';

export class OrganizationBalanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  currentBalance: string;

  @ApiProperty()
  reservedBalance: string;

  @ApiProperty()
  availableBalance: string;

  @ApiProperty()
  currency: string;
}

export class OrganizationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: OrganizationStatus })
  status: OrganizationStatus;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: OrganizationBalanceResponseDto })
  balance?: OrganizationBalanceResponseDto;
}
