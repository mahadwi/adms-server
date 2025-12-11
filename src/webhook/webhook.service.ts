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
  private readonly TIMEOUT = 10000; // 10 detik

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

    try {
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

      this.logger.log(`Webhook sent to ${url} - Status: ${response.status}`);
    } catch (error) {
      const err = error as AxiosError;

      await this.saveFailedWebhook(
        url,
        payload,
        timestamp,
        signature,
        err.message,
      );

      this.logger.error(
        `Failed webhook to ${url}: ${err.message} (${err.code ?? 'NO_CODE'})`,
      );
    }
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
    const tasks = payloads.map((payload, index) =>
      this.sendAttendanceWebhook(webhookUrl, payload, privateKey).catch(
        (error) => {
          this.logger.error(
            `Bulk webhook failed for record ${index + 1}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return null;
        },
      ),
    );

    await Promise.allSettled(tasks);
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
      this.logger.error(`Invalid webhook URL(s): ${webhookUrl}`);
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
      this.logger.error(`Invalid webhook URL(s): ${webhookUrl}`);
      return;
    }

    return this.sendBulkAttendanceWebhook(webhookUrl, payloads, privateKey);
  }
}
