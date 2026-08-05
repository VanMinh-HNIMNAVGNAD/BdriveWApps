import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exceptions/base.exception';
import { ErrorCode } from '../constants/error-code.enum';
import { IErrorResponse } from '../interfaces/api-response.interface';
import { RequestContextService } from '../context/request-context.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { AuditLoggerService } from '../logger/audit-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.logger.setContext('GlobalExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = RequestContextService.getRequestId();
    const path = request.url;
    const timestamp = new Date().toISOString();

    let statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: ErrorCode | string = ErrorCode.INTERNAL_SERVER_ERROR;
    let messageKey = 'common.error.internal_server_error';
    let args: Record<string, any> | undefined = undefined;
    let details: any = undefined;
    let stackTrace: string | undefined = undefined;

    // 1. Clean Architecture Domain Exceptions
    if (exception instanceof BaseException) {
      statusCode = exception.httpStatus;
      errorCode = exception.errorCode;
      messageKey = exception.messageKey;
      args = exception.args;
      details = exception.details;
      stackTrace = exception.stack;
    }
    // 2. Standard NestJS Built-in HttpExceptions
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resPayload = exception.getResponse();

      if (typeof resPayload === 'object' && resPayload !== null) {
        const objPayload = resPayload as Record<string, any>;
        errorCode = objPayload.errorCode || this.mapStatusToErrorCode(statusCode);
        messageKey = objPayload.messageKey || objPayload.message || 'common.error.http_exception';
        details = objPayload.details || (Array.isArray(objPayload.message) ? objPayload.message : undefined);
      } else {
        errorCode = this.mapStatusToErrorCode(statusCode);
        messageKey = String(resPayload);
      }
      stackTrace = exception.stack;
    }
    // 3. Unknown Native / Database / External System Exceptions (500)
    else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
      messageKey = 'common.error.internal_server_error';
      stackTrace = exception.stack;
      
      if (process.env.NODE_ENV !== 'production') {
        details = { message: exception.message, name: exception.name };
      }
    }

    // Standardized REST Error Response Payload
    const errorResponseBody: IErrorResponse = {
      success: false,
      statusCode,
      errorCode,
      messageKey,
      args,
      details,
      timestamp,
      path,
      requestId,
    };

    // Logging & Observability
    if (statusCode >= 500) {
      this.logger.error(
        `[${statusCode}] ${errorCode} - Path: ${path}`,
        stackTrace,
        { errorResponse: errorResponseBody },
      );
    } else {
      this.logger.warn(`[${statusCode}] ${errorCode} - Path: ${path}`, {
        errorResponse: errorResponseBody,
      });
    }

    // Security & Compliance Audit Log Trigger for specific failure modes
    if ([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(statusCode)) {
      this.auditLogger.logAuditEvent({
        action: 'ACCESS_DENIED',
        resource: path,
        status: 'FAILURE',
        errorCode: String(errorCode),
        details: { statusCode, messageKey },
      });
    }

    response.status(statusCode).json(errorResponseBody);
  }

  private mapStatusToErrorCode(status: HttpStatus): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.AUTH_UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.AUTH_FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.USER_ALREADY_EXISTS;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}
