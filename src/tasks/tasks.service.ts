import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FileLoggerService } from 'src/common/logger/file-logger.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { randomMinutes } from 'src/common/utils/format.util';

@Injectable()
export class TasksService {
  logger = new FileLoggerService(TasksService.name);
  private readonly MAX_RETRIES = 3;
  private readonly WEBHOOK_TIMEOUT =
    Number(process.env.WEBHOOK_TIMEOUT_MS) || 30000;
  private readonly URL_REWRITE_FROM = process.env.WEBHOOK_URL_REWRITE_FROM || '';
  private readonly URL_REWRITE_TO = process.env.WEBHOOK_URL_REWRITE_TO || '';
  private isProcessingWebhookRetries = false;

  constructor(
    private prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    if (this.isProcessingWebhookRetries) return;
    this.isProcessingWebhookRetries = true;

    try {
      await this.retryFailedWebhooks();
    } finally {
      this.isProcessingWebhookRetries = false;
    }
  }

  private async retryFailedWebhooks() {
    const now = new Date();
    const pending = await this.prisma.failedWebhook.findMany({
      where: {
        attempts: { lt: this.MAX_RETRIES },
        nextRetry: { lte: now },
      },
      take: 25,
      orderBy: { nextRetry: 'asc' },
    });

    if (pending.length === 0) return;

    this.logger.log(`Webhook retry batch start count=${pending.length}`);

    for (const entry of pending) {
      try {
        const timestamp = entry.timestamp;
        const signature = entry.signature;
        const startedAt = Date.now();
        const deliveryUrl = this.resolveWebhookUrl(entry.url);

        const response = await firstValueFrom(
          this.http.post(deliveryUrl, entry.payload, {
            headers: {
              'User-Agent': 'Adms Server/1.0(Adms Server Webhook)',
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Adms-Timestamp': timestamp,
              'X-Adms-Signature': signature,
            },
            timeout: this.WEBHOOK_TIMEOUT,
          }),
        );

        await this.prisma.failedWebhook.delete({
          where: { id: entry.id },
        });

        this.logger.log(
          `Webhook retry success url=${deliveryUrl} originalUrl=${entry.url} status=${
            response.status
          } durationMs=${Date.now() - startedAt}`,
        );
      } catch (error) {
        const err = error as AxiosError;
        const errorMsg = this.formatWebhookError(err);

        if (!this.shouldRetryWebhook(err)) {
          await this.prisma.failedWebhook.delete({
            where: { id: entry.id },
          });

          this.logger.warn(
            `Webhook retry stopped url=${entry.url} error=${errorMsg}`,
          );
          continue;
        }

        const randomDelay = randomMinutes(1, 5); // 1–5 menit acak
        const nextRetry = new Date(Date.now() + randomDelay);

        await this.prisma.failedWebhook.update({
          where: { id: entry.id },
          data: {
            attempts: { increment: 1 },
            lastError: errorMsg,
            nextRetry,
          },
        });

        this.logger.error(
          `Webhook retry failed url=${entry.url} attempt=${
            entry.attempts + 1
          }/${this.MAX_RETRIES} error=${errorMsg}`,
        );
      }
    }

    this.logger.log(`Webhook retry batch finished count=${pending.length}`);
  }

  private shouldRetryWebhook(error: AxiosError): boolean {
    const status = error.response?.status;
    if (!status) return true;
    return status === 429 || status >= 500;
  }

  private resolveWebhookUrl(url: string): string {
    if (
      !this.URL_REWRITE_FROM ||
      !this.URL_REWRITE_TO ||
      !url.startsWith(this.URL_REWRITE_FROM)
    ) {
      return url;
    }

    const rewritten = `${this.URL_REWRITE_TO}${url.slice(
      this.URL_REWRITE_FROM.length,
    )}`;

    this.logger.log(`Webhook retry URL rewritten from=${url} to=${rewritten}`);

    return rewritten;
  }

  private formatWebhookError(error: AxiosError): string {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const responseText =
      responseData === undefined
        ? ''
        : typeof responseData === 'string'
          ? responseData
          : JSON.stringify(responseData);

    return [
      status ? `HTTP ${status}` : error.message || 'Unknown error',
      responseText ? responseText.slice(0, 500) : '',
    ]
      .filter(Boolean)
      .join(' - ');
  }
}
