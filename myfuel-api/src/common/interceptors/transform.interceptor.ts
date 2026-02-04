import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto } from '../dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  BaseResponseDto<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponseDto<T>> {
    return next.handle().pipe(
      map((data) => {
        // If already wrapped in BaseResponseDto, return as is
        if (data instanceof BaseResponseDto) {
          return data;
        }
        return new BaseResponseDto(data);
      }),
    );
  }
}
