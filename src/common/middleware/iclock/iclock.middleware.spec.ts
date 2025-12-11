import { IclockMiddleware } from './iclock.middleware';

describe('IclockMiddleware', () => {
  it('should be defined', () => {
    expect(new IclockMiddleware()).toBeDefined();
  });
});
