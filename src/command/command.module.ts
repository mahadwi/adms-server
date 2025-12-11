import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandController } from './command.controller';
import { PublicKeyMiddleware } from 'src/common/middleware/public-key/public-key.middleware';
import { DevicesModule } from 'src/devices/devices.module';

@Module({
  imports: [DevicesModule],
  controllers: [CommandController],
  providers: [CommandService],
})
export class CommandModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicKeyMiddleware).forRoutes('command');
  }
}
