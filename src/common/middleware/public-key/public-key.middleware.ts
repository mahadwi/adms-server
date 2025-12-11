import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DevicesService } from 'src/devices/devices.service';

@Injectable()
export class PublicKeyMiddleware implements NestMiddleware {
  constructor(private readonly deviceService: DevicesService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const publicKey = req.headers['x-public-key'];

    if (!publicKey || typeof publicKey !== 'string') {
      throw new UnauthorizedException('Public key is missing');
    }

    const device = await this.deviceService.findByPublicKey(publicKey);
    if (!device) {
      throw new UnauthorizedException('Public key is missing');
    }

    req.device = device;

    next();
  }
}
