import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { RequestContextService } from '../context/request-context.service';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  private contextName = 'Application';

  public setContext(context: string): void {
    this.contextName = context;
  }

  log(message: any, ...optionalParams: any[]): void {
    this.printLog('INFO', message, optionalParams);
  }

  error(message: any, trace?: string, ...optionalParams: any[]): void {
    this.printLog('ERROR', message, optionalParams, trace);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.printLog('WARN', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.printLog('DEBUG', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.printLog('VERBOSE', message, optionalParams);
  }

  private printLog(
    level: string,
    message: any,
    optionalParams: any[],
    trace?: string,
  ): void {
    const requestId = RequestContextService.getRequestId();
    const userId = RequestContextService.getUserId() || 'anonymous';
    const timestamp = new Date().toISOString();

    const logPayload = {
      timestamp,
      level,
      context: this.contextName,
      requestId,
      userId,
      message,
      ...(optionalParams.length ? { meta: optionalParams } : {}),
      ...(trace ? { stack: trace } : {}),
    };

    // Output JSON formatted logs for production / SIEM consumption
    console.log(JSON.stringify(logPayload));
  }
}
