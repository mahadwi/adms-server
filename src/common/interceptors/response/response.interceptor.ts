import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Response, Request } from 'express';
import { getAppVersion } from 'src/common/utils/app.util';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  async intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const url = request.url || '';
    const isIclock = /iclock/.test(url);
    const appVersion = await getAppVersion();

    response.setHeader(
      'X-Powered-By',
      `${process.env.APP_NAME} (${appVersion})`,
    );

    if (isIclock) {
      // Khusus URL iclock, pakai text/plain (fingerprint solution)
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return next.handle();
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    return next.handle().pipe(
      map((data) => ({
        success: true,
        code: response.statusCode || 200,
        data: data ?? null,
      })),
    );
  }
}
