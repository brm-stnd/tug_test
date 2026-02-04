import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ required: false })
  message?: string;

  constructor(data: T, success = true, message?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
  }
}

export class ErrorResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  error: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  details?: unknown;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  timestamp: string;

  constructor(
    error: string,
    message: string,
    statusCode: number,
    details?: unknown,
  ) {
    this.success = false;
    this.error = error;
    this.message = message;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}
