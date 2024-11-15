import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const originalUrl = req.originalUrl;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = context.switchToHttp().getResponse();
        const contentLength = req.socket.bytesWritten;

        this.logger.log(`${method} ${originalUrl} ${statusCode} - ${contentLength} bytes (${duration} ms)`);
        this.logger.log(`Request payload: ${JSON.stringify(req.body)}`);
      }),
    );
  }
}
