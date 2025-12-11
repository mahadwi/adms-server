import { Test, TestingModule } from '@nestjs/testing';
import { IclockService } from './iclock.service';

describe('IclockService', () => {
  let service: IclockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IclockService],
    }).compile();

    service = module.get<IclockService>(IclockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
