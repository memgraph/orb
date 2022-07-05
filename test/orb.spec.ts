import { Orb } from '../src';

describe('Orb', () => {
  test('should be initialized', () => {
    const orb = new Orb();

    expect(orb).not.toBeUndefined();
  });
});
