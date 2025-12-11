import { Controller, Post, Body } from '@nestjs/common';
import { CommandService } from './command.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { GetDevice } from 'src/common/decorators/get-device/get-device.decorator';
import type { Device } from 'generated/prisma';
import { SkipAuth } from 'src/common/decorators/skip-auth/skip-auth.decorator';

@SkipAuth()
@Controller('command')
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Post()
  handleCommand(@GetDevice() device: Device, @Body() body: CreateCommandDto) {
    return this.commandService.create(device.id, body);
  }
}
