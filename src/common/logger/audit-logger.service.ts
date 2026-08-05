import { Injectable } from '@nestjs/common';
import { RequestContextService } from '../context/request-context.service';

export interface IAuditEvent {
  action: string;
  resource: string;
  resourceId?: string;
  status: 'SUCCESS' | 'FAILURE';
  errorCode?: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditLoggerService {
  logAuditEvent(event: IAuditEvent): void {
    const ctx = RequestContextService.getContext();
    const auditRecord = {
      timestamp: new Date().toISOString(),
      eventType: 'AUDIT',
      requestId: ctx?.requestId || 'N/A',
      userId: ctx?.userId || 'anonymous',
      ip: ctx?.ip || 'unknown',
      userAgent: ctx?.userAgent || 'unknown',
      ...event,
    };

    // In enterprise systems, this can send logs to Kafka/ES/PostgreSQL audit table
    console.warn(`[AUDIT LOG] ${JSON.stringify(auditRecord)}`);
  }
}
