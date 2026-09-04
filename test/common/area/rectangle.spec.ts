import { RectangleArea } from '../../../src/common/area/rectangle';

describe('RectangleArea', () => {
  describe('fromPoints', () => {
    test('builds a normalized rectangle from top-left and bottom-right corners', () => {
      const area = RectangleArea.fromPoints({ x: 10, y: 20 }, { x: 110, y: 220 });
      expect(area.getBoundingBox()).toEqual({ x: 10, y: 20, width: 100, height: 200 });
    });

    test('normalizes corners given in any order', () => {
      const area = RectangleArea.fromPoints({ x: 110, y: 220 }, { x: 10, y: 20 });
      expect(area.getBoundingBox()).toEqual({ x: 10, y: 20, width: 100, height: 200 });
    });

    test('supports negative coordinates', () => {
      const area = RectangleArea.fromPoints({ x: -50, y: 30 }, { x: 50, y: -70 });
      expect(area.getBoundingBox()).toEqual({ x: -50, y: -70, width: 100, height: 100 });
    });
  });

  describe('contains', () => {
    const area = RectangleArea.fromPoints({ x: 0, y: 0 }, { x: 100, y: 100 });

    test('returns true for a point inside', () => {
      expect(area.contains({ x: 50, y: 50 })).toBe(true);
    });

    test('returns true for points on the border (inclusive)', () => {
      expect(area.contains({ x: 0, y: 0 })).toBe(true);
      expect(area.contains({ x: 100, y: 100 })).toBe(true);
    });

    test('returns false for a point outside', () => {
      expect(area.contains({ x: 150, y: 50 })).toBe(false);
      expect(area.contains({ x: 50, y: -1 })).toBe(false);
    });
  });
});
