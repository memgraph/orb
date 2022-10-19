import { isCollapsedDimension } from '../../src/utils/html.utils';

describe('html.utils', () => {
  test('should match collapsed style dimensions regex', () => {
    expect(isCollapsedDimension(null)).toBe(true);
    expect(isCollapsedDimension(undefined)).toBe(true);
    expect(isCollapsedDimension('')).toBe(true);
    expect(isCollapsedDimension('0')).toBe(true);
    expect(isCollapsedDimension('0000')).toBe(true);
    expect(isCollapsedDimension('  0 ')).toBe(true);
    expect(isCollapsedDimension('0px')).toBe(true);
    expect(isCollapsedDimension('  00  px  ')).toBe(true);
    expect(isCollapsedDimension('0Rem')).toBe(true);
    expect(isCollapsedDimension('  0  rem  ')).toBe(true);
    expect(isCollapsedDimension('0em')).toBe(true);
    expect(isCollapsedDimension('  00  em  ')).toBe(true);
    expect(isCollapsedDimension('0vH')).toBe(true);
    expect(isCollapsedDimension('  0  vh  ')).toBe(true);
    expect(isCollapsedDimension('0vw')).toBe(true);
    expect(isCollapsedDimension('  00  vw  ')).toBe(true);
    expect(isCollapsedDimension('px')).toBe(false);
    expect(isCollapsedDimension('01px')).toBe(false);
    expect(isCollapsedDimension(' 010 rem ')).toBe(false);
    expect(isCollapsedDimension(' 0 px em rem')).toBe(false);
    expect(isCollapsedDimension('undefined')).toBe(false);
    expect(isCollapsedDimension('null')).toBe(false);
  });
});
