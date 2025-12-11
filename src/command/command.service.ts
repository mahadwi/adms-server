import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeviceCommandType } from 'src/types/command.type';
import { Command } from 'generated/prisma';
import { CreateCommandDto } from './dto/create-command.dto';
import { ucWords } from 'src/common/utils/app.util';

@Injectable()
export class CommandService {
  constructor(private prisma: PrismaService) {}

  async create(deviceId: number, dto: CreateCommandDto) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId },
    });

    if (!device) throw new NotFoundException('Device not found');

    const createdCommands: Command[] = [];
    const type = dto.type.toLowerCase() as DeviceCommandType;

    switch (type) {
      /**
       * _____________________________
       * DEVICE COMMAND
       * _____________________________
       */
      case DeviceCommandType.CHECK:
        createdCommands.push(await this.createCommand(deviceId, 'CHECK'));
        break;

      case DeviceCommandType.RESET:
        await this.prisma.device.update({
          where: { id: deviceId },
          data: { stamp: '0', opStamp: '0' },
        });

        createdCommands.push(await this.createCommand(deviceId, 'CHECK'));

        break;

      case DeviceCommandType.INFO:
        createdCommands.push(await this.createCommand(deviceId, 'INFO'));
        break;

      case DeviceCommandType.LOG:
        createdCommands.push(await this.createCommand(deviceId, 'LOG'));
        break;

      case DeviceCommandType.REBOOT:
        createdCommands.push(await this.createCommand(deviceId, 'REBOOT'));
        break;

      case DeviceCommandType.RELOAD:
        createdCommands.push(
          await this.createCommand(deviceId, 'RELOAD OPTIONS'),
        );
        break;

      /**
       * _____________________________
       * UPDATE SETTINGS
       * _____________________________
       */
      case DeviceCommandType.SET_TIMEZONE: {
        const timezone = dto.timezone ?? 7;

        await this.prisma.device.update({
          where: { id: deviceId },
          data: { timezone: String(timezone) },
        });

        createdCommands.push(
          await this.createCommand(deviceId, `SET OPTION DtFmt=${timezone}`),
        );

        createdCommands.push(await this.createCommand(deviceId, `REBOOT`));

        break;
      }

      case DeviceCommandType.SET_LANGUAGE: {
        createdCommands.push(
          await this.createCommand(
            deviceId,
            `SET OPTION Language=${dto.language}`,
          ),
        );
        break;
      }

      case DeviceCommandType.SET_VOLUME: {
        const volume = dto.volume ?? 50;

        createdCommands.push(
          await this.createCommand(deviceId, `SET OPTION VOLUME=${volume}`),
        );
        break;
      }

      /**
       * _____________________________
       * USER MANAGEMENT
       * _____________________________
       */
      case DeviceCommandType.USER_INFO: {
        const user = await this.prisma.deviceUser.findFirst({
          where: { userId: dto.user_id },
          select: { userId: true },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        const cmd1 = await this.createCommand(
          deviceId,
          `DATA QUERY USERINFO PIN=${user.userId}`,
        );
        const cmd2 = await this.createCommand(
          deviceId,
          `DATA QUERY FINGERTMP PIN=${user.userId}`,
        );

        createdCommands.push(cmd1, cmd2);

        break;
      }

      case DeviceCommandType.USER_EDIT: {
        const user = await this.prisma.deviceUser.findFirst({
          where: { userId: dto.user_id },
        });

        if (!user) throw new NotFoundException('User not found');

        const updateData = {
          ...(dto.name !== undefined && { name: ucWords(dto.name) }),
          ...(dto.privilege !== undefined && { privilege: dto.privilege }),
          ...(dto.password !== undefined && { password: String(dto.password) }),
        };

        await this.prisma.deviceUser.updateMany({
          where: { userId: dto.user_id },
          data: updateData,
        });

        const updated = await this.prisma.deviceUser.findMany({
          where: { userId: dto.user_id },
        });

        for (const u of updated) {
          const payload = [
            `PIN=${u.userId}`,
            `Name=${u.name}`,
            `Passwd=${u.password}`,
            `Pri=${u.privilege}`,
          ].join('\t');

          createdCommands.push(
            await this.createCommand(
              u.deviceId,
              `DATA UPDATE USERINFO ${payload}`,
            ),
          );
        }

        break;
      }

      case DeviceCommandType.USER_DELETE: {
        const users = await this.prisma.deviceUser.findMany({
          where: { userId: dto.user_id },
          select: { userId: true, deviceId: true },
        });

        if (users.length === 0) throw new NotFoundException('User not found');

        const deleteCommands = users.flatMap((user) => [
          this.createCommand(
            user.deviceId,
            `DATA DELETE USERINFO PIN=${user.userId}`,
          ),
          this.createCommand(
            user.deviceId,
            `DATA DELETE FINGERTMP PIN=${user.userId}`,
          ),
        ]);

        const results = await Promise.all(deleteCommands);
        createdCommands.push(...results);

        await this.prisma.$transaction([
          this.prisma.template.deleteMany({ where: { userId: dto.user_id } }),
          this.prisma.deviceUser.deleteMany({ where: { userId: dto.user_id } }),
        ]);

        break;
      }

      case DeviceCommandType.USER_CLONE: {
        if (!dto.device_target?.length) {
          throw new BadRequestException('Target device_id is required');
        }

        const user = await this.prisma.deviceUser.findFirst({
          where: { userId: dto.user_id },
        });

        if (!user) throw new NotFoundException('User not found');

        const targetIds = dto.device_target
          .map(Number)
          .filter((id) => id !== Number(deviceId));

        const [targetDevices, templates] = await Promise.all([
          this.prisma.device.findMany({
            where: { id: { in: targetIds } },
          }),
          this.prisma.template.findMany({
            where: { userId: user.userId, deviceId: Number(deviceId) },
          }),
        ]);

        if (!targetDevices.length) {
          throw new NotFoundException('No valid target devices found');
        }

        const userPayload = [
          `PIN=${user.userId}`,
          `Name=${user.name ?? user.userId}`,
          `Pri=${user.privilege ?? 0}`,
          `Passwd=${user.password ?? ''}`,
          `Card=${user.mainCard ?? ''}`,
          `Grp=${user.group ?? ''}`,
          `TZ=${user.template ?? ''}`,
          `Verify=${user.verifyType ?? ''}`,
          `ViceCard=${user.viceCard ?? ''}`,
          `StartDatetime=0`,
          `EndDatetime=0`,
        ].join('\t');

        const templatePayloads = templates.map((t) =>
          [
            `PIN=${t.userId}`,
            `FID=${t.fid}`,
            `TMP=${t.encode}`,
            `Size=${t.size}`,
            `Valid=${t.valid}`,
          ].join('\t'),
        );

        const cloneCommands = targetDevices.flatMap((dev) => [
          this.createCommand(dev.id, `DATA UPDATE USERINFO ${userPayload}`),
          ...templatePayloads.map((template) =>
            this.createCommand(dev.id, `DATA UPDATE FINGERTMP ${template}`),
          ),
        ]);

        const results = await Promise.all(cloneCommands);
        createdCommands.push(...results);

        break;
      }

      case DeviceCommandType.USER_MOVE: {
        if (!dto.device_target?.length) {
          throw new BadRequestException('Target device_id is required');
        }

        const user = await this.prisma.deviceUser.findFirst({
          where: { userId: dto.user_id },
        });

        if (!user) throw new NotFoundException('User not found');

        const targetIds = dto.device_target
          .map(Number)
          .filter((id) => id !== Number(deviceId));

        const [targetDevices, templates] = await Promise.all([
          this.prisma.device.findMany({
            where: { id: { in: targetIds } },
          }),
          this.prisma.template.findMany({
            where: { userId: user.userId, deviceId: Number(deviceId) },
          }),
        ]);

        if (!targetDevices.length) {
          throw new NotFoundException('No valid target devices found');
        }

        const userPayload = [
          `PIN=${user.userId}`,
          `Name=${user.name ?? user.userId}`,
          `Pri=${user.privilege ?? 0}`,
          `Passwd=${user.password ?? ''}`,
          `Card=${user.mainCard ?? ''}`,
          `Grp=${user.group ?? ''}`,
          `TZ=${user.template ?? ''}`,
          `Verify=${user.verifyType ?? ''}`,
          `ViceCard=${user.viceCard ?? ''}`,
          `StartDatetime=0`,
          `EndDatetime=0`,
        ].join('\t');

        const templatePayloads = templates.map((t) =>
          [
            `PIN=${t.userId}`,
            `FID=${t.fid}`,
            `TMP=${t.encode}`,
            `Size=${t.size}`,
            `Valid=${t.valid}`,
          ].join('\t'),
        );

        const moveCommands = targetDevices.flatMap((dev) => [
          this.createCommand(dev.id, `DATA UPDATE USERINFO ${userPayload}`),
          ...templatePayloads.map((template) =>
            this.createCommand(dev.id, `DATA UPDATE FINGERTMP ${template}`),
          ),
        ]);

        const deleteFromSourceCommands = [
          this.createCommand(
            Number(deviceId),
            `DATA DELETE USERINFO PIN=${user.userId}`,
          ),
          this.createCommand(
            Number(deviceId),
            `DATA DELETE FINGERTMP PIN=${user.userId}`,
          ),
        ];

        const results = await Promise.all([
          ...moveCommands,
          ...deleteFromSourceCommands,
        ]);

        createdCommands.push(...results);

        await this.prisma.$transaction([
          this.prisma.template.deleteMany({
            where: { userId: dto.user_id, deviceId: Number(deviceId) },
          }),
          this.prisma.deviceUser.deleteMany({
            where: { userId: dto.user_id, deviceId: Number(deviceId) },
          }),
        ]);

        break;
      }

      /**
       * _____________________________
       * DOWNLOAD ATTENDANCE
       * _____________________________
       */
      case DeviceCommandType.ATTENDANCE_DOWNLOAD: {
        if (!dto.start_date || !dto.end_date) {
          throw new BadRequestException('start_date and end_date required');
        }

        const StartTime = `${dto.start_date} 00:00:00`;
        const EndTime = `${dto.end_date} 23:59:59`;

        createdCommands.push(
          await this.createCommand(
            deviceId,
            `DATA QUERY ATTLOG StartTime=${StartTime}\tEndTime=${EndTime}`,
          ),
        );
        break;
      }

      case DeviceCommandType.ATTENDANCE_VERIFY: {
        if (!dto.start_date || !dto.end_date) {
          throw new BadRequestException('start_date and end_date required');
        }

        const StartTime = `${dto.start_date} 00:00:00`;
        const EndTime = `${dto.end_date} 23:59:59`;

        createdCommands.push(
          await this.createCommand(
            deviceId,
            `VERIFY SUM ATTLOG StartTime=${StartTime}\tEndTime=${EndTime}`,
          ),
        );
        break;
      }

      case DeviceCommandType.ATTENDANCE_CLEAR: {
        createdCommands.push(await this.createCommand(deviceId, `CLEAR LOG`));
        break;
      }

      // _____________________________
      // COMMAND SYSTEM
      // _____________________________
      case DeviceCommandType.SHELL: {
        if (!dto.command) {
          throw new BadRequestException('command is required');
        }

        const command = dto.command.trim();
        createdCommands.push(
          await this.createCommand(deviceId, `SHELL ${command}`),
        );
        break;
      }

      default:
        throw new BadRequestException(`Unsupported command type: ${dto.type}`);
    }

    return createdCommands;
  }

  private async createCommand(deviceId: number, command: string) {
    return this.prisma.command.create({
      data: {
        deviceId,
        command,
        status: 'pending',
      },
    });
  }
}
