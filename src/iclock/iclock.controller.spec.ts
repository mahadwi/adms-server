import { Test, TestingModule } from '@nestjs/testing';
import { IclockController } from './iclock.controller';
import { IclockService } from './iclock.service';

describe('IclockController', () => {
  let controller: IclockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IclockController],
      providers: [IclockService],
    }).compile();

    controller = module.get<IclockController>(IclockController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
