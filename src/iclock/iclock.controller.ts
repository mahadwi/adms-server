import { Controller, Get, Body, Req, Post } from '@nestjs/common';
import { IclockService } from './iclock.service';
import { PayloadParams } from 'src/types/iclock.type';
import { SkipAuth } from 'src/common/decorators/skip-auth/skip-auth.decorator';

@SkipAuth()
@Controller('iclock')
export class IclockController {
  constructor(private readonly iclockService: IclockService) {}

  private normalizeParams(input: PayloadParams): PayloadParams {
    const { query, body } = input;

    const keysToLowerCase = (obj: Record<string, any>) => {
      const newObj: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const index = key.trim().toLowerCase();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          newObj[index] = obj[key];
        }
      }
      return newObj;
    };

    return {
      query: keysToLowerCase(query ?? {}),
      body: body,
    };
  }

  // GET /iclock/cdata
  @Get('cdata')
  index(@Req() req: Express.Request, @Body() body: Buffer | null) {
    const params = this.normalizeParams({
      query: req.query,
      body: body,
    });
    return this.iclockService.index(req.device, params);
  }

  // GET /iclock/getrequest
  @Get('getrequest')
  getRequest(@Req() req: Express.Request, @Body() body: Buffer | null) {
    const params = this.normalizeParams({
      query: req.query,
      body: body,
    });
    return this.iclockService.getRequest(req.device, params);
  }

  // POST /iclock/cdata
  @Post('cdata')
  create(@Req() req: Express.Request, @Body() body: Buffer | null) {
    const params = this.normalizeParams({
      query: req.query,
      body: body,
    });
    return this.iclockService.create(req.device, params);
  }

  // POST /iclock/devicecmd
  @Post('devicecmd')
  deviceCmd(@Req() req: Express.Request, @Body() body: Buffer | null) {
    const params = this.normalizeParams({
      query: req.query,
      body: body,
    });
    return this.iclockService.command(req.device, params);
  }
}
