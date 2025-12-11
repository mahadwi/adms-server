import { MiddlewareConsumer, Module } from '@nestjs/common';
import { IclockService } from './iclock.service';
import { IclockController } from './iclock.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { IclockMiddleware } from 'src/common/middleware/iclock/iclock.middleware';
import { RawBodyMiddleware } from 'src/common/middleware/raw-body/raw-body.middleware';
import { DevicesModule } from 'src/devices/devices.module';
import { WebhookModule } from 'src/webhook/webhook.module';

@Module({
  imports: [DevicesModule, WebhookModule],
  controllers: [IclockController],
  providers: [IclockService, PrismaService],
})
export class IclockModule {
  configure(consumer: MiddlewareConsumer) {
    // semua route iclock/*
    consumer.apply(RawBodyMiddleware, IclockMiddleware).forRoutes('iclock');
  }
}
