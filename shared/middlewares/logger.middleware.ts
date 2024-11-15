import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('Request...', {
      method: req.method,
      url: req.url,
      body: req.body,
    });

    // Capture the response body
    const originalSend = res.send;
    res.send = function (body: any) {
      console.log('Response...', {
        statusCode: res.statusCode,
        body: body,
      });
      // Explicitly type the arguments as [body?: any]
      return originalSend.call(this, body);
    };

    next();
  }
}
