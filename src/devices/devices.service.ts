import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateApiKey } from 'src/common/utils/hash.util';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async findByPublicKey(publicKey: string) {
    return await this.prisma.device.findFirst({ where: { publicKey } });
  }

  async findBySerial(serialNumber: string) {
    return await this.prisma.device.findFirst({ where: { serialNumber } });
  }

  async create(userId: number, dto: CreateDeviceDto) {
    const { publicKey, privateKey } = generateApiKey();

    const device = await this.prisma.device.create({
      data: {
        userId: userId,
        serialNumber: dto.serial_number,
        location: dto.location,
        webhookUrl: dto.webhook_url,
        publicKey: publicKey,
        privateKey: privateKey,
      },
      select: {
        id: true,
        serialNumber: true,
        model: true,
        auth: true,
        location: true,
        webhookUrl: true,
        publicKey: true,
        privateKey: true,
        stamp: true,
        opStamp: true,
        transTimes: true,
        transFlag: true,
        encryption: true,
        firmwareVersion: true,
        ipAddress: true,
        macAddress: true,
        fingerprintAlgorithm: true,
        faceAlgorithm: true,
        featureSupport: true,
        errorDelay: true,
        delay: true,
        transInterval: true,
        realtime: true,
        timezone: true,
        totalUsers: true,
        totalFingerprints: true,
        totalFaces: true,
        totalFacesEnrolled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.command.createMany({
      data: [
        {
          deviceId: device.id,
          command: 'INFO',
        },
        {
          deviceId: device.id,
          command: 'CHECK',
        },
      ],
    });
    return device;
  }

  async findAll() {
    return await this.prisma.device.findMany({
      select: {
        id: true,
        serialNumber: true,
        model: true,
        auth: true,
        location: true,
        webhookUrl: true,
        publicKey: true,
        privateKey: true,
        stamp: true,
        opStamp: true,
        transTimes: true,
        transFlag: true,
        encryption: true,
        firmwareVersion: true,
        ipAddress: true,
        macAddress: true,
        fingerprintAlgorithm: true,
        faceAlgorithm: true,
        featureSupport: true,
        errorDelay: true,
        delay: true,
        transInterval: true,
        realtime: true,
        timezone: true,
        totalUsers: true,
        totalFingerprints: true,
        totalFaces: true,
        totalFacesEnrolled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number) {
    const device = await this.prisma.device.findFirst({ where: { id } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return await this.prisma.device.findUnique({
      where: { id },
      select: {
        id: true,
        serialNumber: true,
        model: true,
        auth: true,
        location: true,
        webhookUrl: true,
        publicKey: true,
        privateKey: true,
        stamp: true,
        opStamp: true,
        transTimes: true,
        transFlag: true,
        encryption: true,
        firmwareVersion: true,
        ipAddress: true,
        macAddress: true,
        fingerprintAlgorithm: true,
        faceAlgorithm: true,
        featureSupport: true,
        errorDelay: true,
        delay: true,
        transInterval: true,
        realtime: true,
        timezone: true,
        totalUsers: true,
        totalFingerprints: true,
        totalFaces: true,
        totalFacesEnrolled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: number, dto: UpdateDeviceDto) {
    const device = await this.prisma.device.findFirst({ where: { id } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return await this.prisma.device.update({
      where: { id },
      data: {
        location: dto.location || device.location,
        webhookUrl: dto.webhook_url || device.webhookUrl,
        delay: dto.delay || device.delay,
        errorDelay: dto.error_delay || device.errorDelay,
      },
      select: {
        id: true,
        serialNumber: true,
        model: true,
        auth: true,
        location: true,
        webhookUrl: true,
        publicKey: true,
        privateKey: true,
        stamp: true,
        opStamp: true,
        transTimes: true,
        transFlag: true,
        encryption: true,
        firmwareVersion: true,
        ipAddress: true,
        macAddress: true,
        fingerprintAlgorithm: true,
        faceAlgorithm: true,
        featureSupport: true,
        errorDelay: true,
        delay: true,
        transInterval: true,
        realtime: true,
        timezone: true,
        totalUsers: true,
        totalFingerprints: true,
        totalFaces: true,
        totalFacesEnrolled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: number) {
    const device = await this.prisma.device.findFirst({ where: { id } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    await this.prisma.device.delete({ where: { id } });
    return null;
  }
}
