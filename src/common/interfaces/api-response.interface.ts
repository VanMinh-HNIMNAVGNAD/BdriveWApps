export interface IApiResponse<T = any> {
  success: true;
  statusCode: number;
  data: T;
  meta?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

export interface IValidationFieldError {
  field: string;
  errors: string[];
}

export interface IErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  messageKey: string;
  message?: string;
  args?: Record<string, any>;
  details?: Record<string, any> | IValidationFieldError[];
  timestamp: string;
  path: string;
  requestId: string;
}
