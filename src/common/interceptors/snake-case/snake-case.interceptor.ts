import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import snakeCase from 'lodash/snakeCase';
import { DateTime } from 'luxon';
import { map, Observable } from 'rxjs';

@Injectable()
export class SnakeCaseInterceptor implements NestInterceptor {
  private readonly tz = process.env.TZ || 'Asia/Jakarta';
  private readonly dateFormat = 'yyyy-MM-dd HH:mm:ss';

  private convert(data: unknown): unknown {
    if (data instanceof Date) {
      return DateTime.fromJSDate(data)
        .setZone(this.tz)
        .toFormat(this.dateFormat);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.convert(item));
    }

    if (data !== null && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const key of Object.keys(obj)) {
        result[snakeCase(key)] = this.convert(obj[key]);
      }

      return result;
    }

    return data;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.convert(data)));
  }
}
