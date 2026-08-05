import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerRequestId = req.headers['x-request-id'] as string;
    const requestId = headerRequestId || randomUUID();

    // Attach to request & response headers
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    const context = {
      requestId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    RequestContextService.run(context, () => {
      next();
    });
  }
}
