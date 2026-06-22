import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from 'src/common/logger/file-logger.service';
import { DevicesService } from 'src/devices/devices.service';

@Injectable()
export class IclockMiddleware implements NestMiddleware {
  private logger = new FileLoggerService(IclockMiddleware.name);

  constructor(private readonly deviceService: DevicesService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const query = req.query as Record<string, unknown>;
    const sn = (query?.SN as string) || (query?.sn as string);

    if (!sn || typeof sn !== 'string') {
      this.logger.warn(
        `ICLOCK rejected: missing SN path=${req.originalUrl || req.url}`,
      );
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send('Invalid parameter');
    }

    const device = await this.deviceService.findBySerial(sn);

    if (!device) {
      this.logger.warn(
        `ICLOCK rejected: device not registered SN=${sn} path=${
          req.originalUrl || req.url
        }`,
      );

      res.setHeader('Content-Type', 'text/plain');

      return res.status(403).send('Device not registered');
    }

    this.logger.log(
      `ICLOCK request SN=${sn} method=${req.method} path=${
        req.originalUrl || req.url
      }`,
    );

    req.device = device;

    next();
  }
}
