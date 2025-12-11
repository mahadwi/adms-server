import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { FileLoggerService } from 'src/common/logger/file-logger.service';

type ErrorObject = Record<string, unknown>;
type ErrorResponse = string | ErrorObject;

function extractMessage(value: unknown): string | string[] {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'message')
  ) {
    const msg = (value as ErrorObject).message;

    if (typeof msg === 'string') {
      return msg;
    }

    if (Array.isArray(msg) && msg.every((i) => typeof i === 'string')) {
      return msg;
    }
  }

  return 'Internal Server Error';
}

function isPrismaError(
  error: unknown,
): error is { code: string; meta?: any; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: string; meta?: any; message: string }).code ===
      'string'
  );
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const logger = new FileLoggerService(HttpExceptionFilter.name);

    logger.error(exception);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      errorResponse = typeof res === 'string' ? res : (res as ErrorObject);
    } else if (exception instanceof Error) {
      errorResponse = exception.message;

      // Deteksi Prisma error
      if (isPrismaError(exception)) {
        switch (exception.code) {
          case 'P2002': {
            const meta = exception.meta as { target?: unknown };
            const targetFields = meta.target as string[] | undefined;
            errorResponse = targetFields
              ? `${targetFields.join(', ')} already exists`
              : 'Duplicate entry';
            status = HttpStatus.BAD_REQUEST;
            break;
          }

          case 'P2003':
            errorResponse = 'Data reference error';
            status = HttpStatus.BAD_REQUEST;
            break;

          case 'P2000':
            errorResponse = 'Value too long for column';
            status = HttpStatus.BAD_REQUEST;
            break;

          default:
            errorResponse = exception.message;
            status = HttpStatus.BAD_REQUEST;
            break;
        }
      }
    }

    const errorMessage = extractMessage(errorResponse);

    const clientMessage =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal Server Error'
        : Array.isArray(errorMessage)
          ? errorMessage.join(', ')
          : errorMessage;

    response
      .status(status)
      .setHeader('X-Powered-By', process.env.APP_NAME || 'ADMS API')
      .json({
        success: false,
        code: status,
        message: clientMessage,
      });
  }
}
