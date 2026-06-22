import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FileLoggerService } from 'src/common/logger/file-logger.service';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { AttendanceWebhookPayload } from '../types/webhook.types';
import { createSignature } from 'src/common/utils/hash.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomMinutes } from 'src/common/utils/format.util';

@Injectable()
export class WebhookService {
  private readonly logger = new FileLoggerService(WebhookService.name);
  private readonly TIMEOUT = Number(process.env.WEBHOOK_TIMEOUT_MS) || 10000;
  private readonly CONCURRENCY = Math.max(
    1,
    Number(process.env.WEBHOOK_CONCURRENCY) || 3,
  );

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async sendAttendanceWebhook(
    webhookUrl: string,
    payload: AttendanceWebhookPayload,
    privateKey: string,
  ): Promise<void> {
    const urls = webhookUrl.split(',').map((url) => url.trim());

    for (const url of urls) {
      await this.sendSingleWebhook(url, payload, privateKey);
    }
  }

  private async sendSingleWebhook(
    url: string,
    payload: AttendanceWebhookPayload,
    privateKey: string,
  ): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createSignature(timestamp.toString(), privateKey);
    const startedAt = Date.now();

    try {
      this.logger.log(
        `Webhook sending url=${url} sn=${payload.sn} user=${payload.user_id} attendance=${payload.timestamp}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'User-Agent': 'Adms Server/1.0(Adms Server Webhook)',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Adms-Timestamp': timestamp,
            'X-Adms-Signature': signature,
          },
          timeout: this.TIMEOUT,
        }),
      );

      this.logger.log(
        `Webhook sent url=${url} status=${response.status} durationMs=${
          Date.now() - startedAt
        } sn=${payload.sn} user=${payload.user_id} attendance=${payload.timestamp}`,
      );
    } catch (error) {
      const err = error as AxiosError;
      const detail = this.formatWebhookError(err);

      if (!this.shouldRetryWebhook(err)) {
        this.logger.warn(
          `Webhook rejected url=${url} durationMs=${
            Date.now() - startedAt
          } sn=${payload.sn} user=${payload.user_id} attendance=${
            payload.timestamp
          } error=${detail}`,
        );
        return;
      }

      await this.saveFailedWebhook(url, payload, timestamp, signature, detail);

      this.logger.error(
        `Webhook failed url=${url} durationMs=${Date.now() - startedAt} sn=${
          payload.sn
        } user=${payload.user_id} attendance=${payload.timestamp} error=${detail} code=${
          err.code ?? 'NO_CODE'
        }`,
      );
    }
  }

  private shouldRetryWebhook(error: AxiosError): boolean {
    const status = error.response?.status;
    if (!status) return true;
    return status === 429 || status >= 500;
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
      status ? `HTTP ${status}` : error.message,
      responseText ? responseText.slice(0, 500) : '',
    ]
      .filter(Boolean)
      .join(' - ');
  }

  private async saveFailedWebhook(
    url: string,
    payload: AttendanceWebhookPayload,
    timestamp: number,
    signature: string,
    errorMsg: string,
  ) {
    const randomDelay = randomMinutes(1, 5); // 1–5 menit acak
    const nextRetry = new Date(Date.now() + randomDelay);

    await this.prisma.failedWebhook.create({
      data: {
        url,
        payload: { ...payload },
        timestamp,
        signature,
        lastError: errorMsg,
        attempts: 0,
        nextRetry,
      },
    });
  }

  async sendBulkAttendanceWebhook(
    webhookUrl: string,
    payloads: AttendanceWebhookPayload[],
    privateKey: string,
  ): Promise<void> {
    this.logger.log(
      `Webhook bulk start url=${webhookUrl} records=${payloads.length} concurrency=${this.CONCURRENCY}`,
    );

    let cursor = 0;
    const workerCount = Math.min(this.CONCURRENCY, payloads.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < payloads.length) {
        const index = cursor;
        cursor += 1;

        await this.sendAttendanceWebhook(
          webhookUrl,
          payloads[index],
          privateKey,
        ).catch((error) => {
          this.logger.error(
            `Bulk webhook failed for record ${index + 1}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
      }
    });

    await Promise.allSettled(workers);

    this.logger.log(
      `Webhook bulk finished url=${webhookUrl} records=${payloads.length}`,
    );
  }

  /**
   * Validasi URL (single)
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validasi multiple URLs
   */
  private multipleValidWebhookUrls(webhookUrl: string): boolean {
    return webhookUrl
      .split(',')
      .map((url) => url.trim())
      .every((url) => this.isValidWebhookUrl(url));
  }

  async sendAttendanceWebhookSafe(
    webhookUrl: string,
    payload: AttendanceWebhookPayload,
    privateKey: string,
  ): Promise<void> {
    if (!this.multipleValidWebhookUrls(webhookUrl)) {
      this.logger.error(`Webhook skipped invalid_url=${webhookUrl}`);
      return;
    }

    return this.sendAttendanceWebhook(webhookUrl, payload, privateKey);
  }

  async sendBulkAttendanceWebhookSafe(
    webhookUrl: string,
    payloads: AttendanceWebhookPayload[],
    privateKey: string,
  ): Promise<void> {
    if (!this.multipleValidWebhookUrls(webhookUrl)) {
      this.logger.error(`Webhook bulk skipped invalid_url=${webhookUrl}`);
      return;
    }

    return this.sendBulkAttendanceWebhook(webhookUrl, payloads, privateKey);
  }
}
