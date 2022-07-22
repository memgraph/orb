import { Orb } from '../src/index';

describe('Orb', () => {
  test('should be initialized', () => {
    const orb = new Orb();

    expect(orb).not.toBeUndefined();
  });
});
