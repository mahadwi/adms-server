import { ConsoleLogger, Injectable, LoggerService } from '@nestjs/common';
import type { ConsoleLoggerOptions } from '@nestjs/common/services/console-logger.service';
import * as fs from 'fs';
import * as path from 'path';

type LogMessage = unknown;
type LogOptionalParams = unknown[];

@Injectable()
export class FileLoggerService extends ConsoleLogger implements LoggerService {
  private readonly logDir = path.join(process.cwd(), 'logs');
  private currentDate = this.getDateString();
  private logFilePath = path.join(this.logDir, `adms-${this.currentDate}.log`);

  constructor(
    contextOrOptions?: string | ConsoleLoggerOptions,
    maybeOptions?: ConsoleLoggerOptions,
  ) {
    const defaultOptions: ConsoleLoggerOptions = {
      json: process.env.NODE_ENV === 'production',
      colors: true,
    };

    if (typeof contextOrOptions === 'string') {
      super(contextOrOptions, { ...defaultOptions, ...maybeOptions });
    } else if (
      typeof contextOrOptions === 'object' &&
      contextOrOptions !== null
    ) {
      super('', { ...defaultOptions, ...contextOrOptions });
    } else {
      super('', defaultOptions);
    }

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private rotateIfNeeded() {
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.logFilePath = path.join(this.logDir, `${this.currentDate}.log`);
    }
  }

  private normalizeMessage(msg: LogMessage): string {
    if (typeof msg === 'string') return msg;
    if (msg instanceof Error) return msg.message;

    try {
      return JSON.stringify(msg);
    } catch {
      return String(msg);
    }
  }

  private normalizeStack(stack: unknown): string | undefined {
    if (typeof stack === 'string') return stack;
    if (stack instanceof Error) return stack.stack ?? undefined;
    return undefined;
  }

  private writeToFile(
    level: string,
    message: LogMessage,
    context?: string,
    stack?: unknown,
  ): void {
    this.rotateIfNeeded();

    const timestamp = Date.now();
    const msgString = this.normalizeMessage(message);
    const stackString = this.normalizeStack(stack);

    const jsonMode =
      (this as unknown as { options?: { json?: boolean } }).options?.json ??
      false;

    const line = jsonMode
      ? JSON.stringify({
          timestamp,
          level,
          context,
          message: msgString,
          stack: stackString,
          pid: process.pid,
        }) + '\n'
      : `[${timestamp}] [${level}]${context ? ' [' + context + ']' : ''} ${msgString}${
          stackString ? '\n' + stackString : ''
        }\n`;

    fs.appendFileSync(this.logFilePath, line, 'utf8');
  }

  /**
   * Override log methods to write to files
   */

  log(message: LogMessage, ...optional: LogOptionalParams): void {
    const combined = this.combineMessage(message, optional);
    const context = this.extractContext(optional);

    super.log(combined, context ?? '');
    this.writeToFile('log', combined, context);
  }

  warn(message: LogMessage, ...optional: LogOptionalParams): void {
    const combined = this.combineMessage(message, optional);
    const context = this.extractContext(optional);

    super.warn(combined, context ?? '');
    this.writeToFile('warn', combined, context);
  }

  debug(message: LogMessage, ...optional: LogOptionalParams): void {
    const combined = this.combineMessage(message, optional);
    const context = this.extractContext(optional);

    super.debug(combined, context ?? '');
    this.writeToFile('debug', combined, context);
  }

  verbose(message: LogMessage, ...optional: LogOptionalParams): void {
    const combined = this.combineMessage(message, optional);
    const context = this.extractContext(optional);

    super.verbose(combined, context ?? '');
    this.writeToFile('verbose', combined, context);
  }

  fatal(message: LogMessage, ...optional: LogOptionalParams): void {
    const combined = this.combineMessage(message, optional);
    const context = this.extractContext(optional);

    super.fatal?.(combined, context ?? '');
    this.writeToFile('fatal', combined, context);
  }

  error(message: LogMessage, ...optional: LogOptionalParams): void {
    const { context, stack } = this.extractStackAndContext(optional);

    const combined = this.combineMessage(message, optional);

    const normalizedStack =
      this.normalizeStack(stack) ??
      (message instanceof Error ? message.stack : undefined);

    super.error(combined, normalizedStack, context ?? '');

    this.writeToFile('error', combined, context, normalizedStack);
  }

  private extractContext(optional: LogOptionalParams): string {
    const last = optional[optional.length - 1];
    return typeof last === 'string' ? last : '';
  }

  private extractStackAndContext(optional: LogOptionalParams): {
    stack?: unknown;
    context?: string;
  } {
    if (optional.length === 1) {
      return {
        context: typeof optional[0] === 'string' ? optional[0] : undefined,
      };
    }

    if (optional.length >= 2) {
      return {
        stack: optional[0],
        context: typeof optional[1] === 'string' ? optional[1] : undefined,
      };
    }

    return {};
  }

  private combineMessage(
    message: LogMessage,
    optional: LogOptionalParams,
  ): string {
    const base = this.normalizeMessage(message);

    if (!optional.length) return base;

    const extraObjects = optional
      .filter((o) => typeof o === 'object' && o !== null)
      .map((o) => JSON.stringify(o))
      .join(' ');

    return extraObjects ? `${base} ${extraObjects}` : base;
  }
}
