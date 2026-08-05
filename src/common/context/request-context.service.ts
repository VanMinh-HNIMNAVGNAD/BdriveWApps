import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';

export interface IRequestContext {
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class RequestContextService {
  private static readonly als = new AsyncLocalStorage<IRequestContext>();

  public static run(context: IRequestContext, callback: () => void): void {
    this.als.run(context, callback);
  }

  public static getContext(): IRequestContext | undefined {
    return this.als.getStore();
  }

  public static getRequestId(): string {
    return this.getContext()?.requestId || 'N/A';
  }

  public static getUserId(): string | undefined {
    return this.getContext()?.userId;
  }
}
