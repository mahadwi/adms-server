import { PublicKeyMiddleware } from './public-key.middleware';

describe('PublicKeyMiddleware', () => {
  it('should be defined', () => {
    expect(new PublicKeyMiddleware()).toBeDefined();
  });
});
