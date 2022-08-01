import { Orb } from '../src/index';

describe('Orb', () => {
  test('should be initialized', () => {
    const orb = new Orb(new HTMLElement());

    expect(orb).not.toBeUndefined();
  });
});
