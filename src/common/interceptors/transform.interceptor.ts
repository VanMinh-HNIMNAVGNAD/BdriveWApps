import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { IApiResponse } from '../interfaces/api-response.interface';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, IApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<IApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((resData) => {
        const statusCode = response.statusCode;
        const requestId = RequestContextService.getRequestId();
        const timestamp = new Date().toISOString();

        // Support paginated or metadata wrapped responses from services
        if (
          resData &&
          typeof resData === 'object' &&
          'data' in resData &&
          'meta' in resData
        ) {
          return {
            success: true,
            statusCode,
            data: resData.data,
            meta: resData.meta,
            timestamp,
            requestId,
          };
        }

        return {
          success: true,
          statusCode,
          data: resData ?? null,
          timestamp,
          requestId,
        };
      }),
    );
  }
}
