import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorLogService } from '@gitroom/nestjs-libraries/database/prisma/error-log/error-log.service';

@Injectable()
export class ErrorLogInterceptor implements NestInterceptor {
  constructor(private _errorLogService: ErrorLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        const status = err instanceof HttpException ? err.getStatus() : 500;
        if (status >= 500) {
          const req = context.switchToHttp().getRequest();
          this._errorLogService
            .createLog({
              source: 'backend',
              message: err?.message || String(err),
              stack: err?.stack,
              endpoint: req?.url,
              method: req?.method,
              requestBody: req?.body
                ? JSON.stringify(req.body).slice(0, 10000)
                : '{}',
              statusCode: status,
              userId: req?.user?.id,
              organizationId: req?.org?.id,
            })
            .catch(() => {});
        }
        return throwError(() => err);
      })
    );
  }
}
