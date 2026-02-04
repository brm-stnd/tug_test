import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardStatus } from '../entities/card.entity';

export class CardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ description: 'Masked card number' })
  cardNumber: string;

  @ApiProperty({ enum: CardStatus })
  status: CardStatus;

  @ApiProperty()
  dailyLimit: string;

  @ApiProperty()
  monthlyLimit: string;

  @ApiPropertyOptional()
  holderName?: string;

  @ApiPropertyOptional()
  expiryDate?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CardSpendingDto {
  @ApiProperty()
  dailySpent: string;

  @ApiProperty()
  dailyRemaining: string;

  @ApiProperty()
  monthlySpent: string;

  @ApiProperty()
  monthlyRemaining: string;

  @ApiProperty()
  periodDate: string;
}

export class CardWithSpendingDto extends CardResponseDto {
  @ApiProperty({ type: CardSpendingDto })
  spending: CardSpendingDto;
}
