import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [DevicesController],
  providers: [DevicesService, PrismaService],
  exports: [DevicesService, PrismaService],
})
export class DevicesModule {}
