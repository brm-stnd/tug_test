import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty()
  status: 'accepted' | 'processed' | 'already_processed';

  @ApiProperty()
  eventId: string;

  @ApiProperty({ required: false })
  transactionId?: string;

  @ApiProperty({ required: false })
  message?: string;
}

export class TransactionResultDto {
  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  status: 'APPROVED' | 'DECLINED';

  @ApiProperty({ required: false })
  declineReason?: string;

  @ApiProperty()
  amount: string;

  @ApiProperty({ required: false })
  newBalance?: string;
}
