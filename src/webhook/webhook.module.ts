import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookService } from './webhook.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [WebhookService, PrismaService],
  exports: [WebhookService, HttpModule],
})
export class WebhookModule {}
