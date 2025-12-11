import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  private rawParser = bodyParser.raw({
    type: '*/*',
    limit: '100mb',
  });

  use(req: Request, res: Response, next: NextFunction) {
    // Parser hanya untuk route /iclock/*
    this.rawParser(req, res, next);
  }
}
