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

  constructor(
    private prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    const now = new Date();
    const pending = await this.prisma.failedWebhook.findMany({
      where: {
        attempts: { lt: this.MAX_RETRIES },
        nextRetry: { lte: now },
      },
    });

    if (pending.length === 0) return;

    for (const entry of pending) {
      try {
        const timestamp = entry.timestamp;
        const signature = entry.signature;

        const response = await firstValueFrom(
          this.http.post(entry.url, entry.payload, {
            headers: {
              'User-Agent': 'Adms Server/1.0(Adms Server Webhook)',
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Adms-Timestamp': timestamp,
              'X-Adms-Signature': signature,
            },
            timeout: 10000,
          }),
        );

        await this.prisma.failedWebhook.delete({
          where: { id: entry.id },
        });

        this.logger.log(
          `Webhook retry success for ${entry.url} - Status: ${response.status}`,
        );
      } catch (error) {
        const err = error as AxiosError;
        const errorMsg = err?.message ?? 'Unknown error';

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
          `Retry ${entry.attempts + 1}/${this.MAX_RETRIES} failed for ${entry.url}: ${errorMsg}`,
        );
      }
    }
  }
}
