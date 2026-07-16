import { NodeShapeType } from '../../models/node';
import { IPosition } from '../../common';
import { formatNumber, ISVGAttributes } from './utils';

export interface ISVGShape {
  tag: string;
  attributes: ISVGAttributes;
}

const toPointsAttribute = (points: IPosition[]): string => {
  return points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(' ');
};

const polygon = (points: IPosition[]): ISVGShape => {
  return { tag: 'polygon', attributes: { points: toPointsAttribute(points) } };
};

export const shapeToSVGShape = (shape: NodeShapeType | undefined, x: number, y: number, r: number): ISVGShape => {
  switch (shape) {
    case NodeShapeType.SQUARE:
      return { tag: 'rect', attributes: { x: x - r, y: y - r, width: r * 2, height: r * 2 } };
    case NodeShapeType.DIAMOND:
      return polygon([
        { x, y: y + r },
        { x: x + r, y },
        { x, y: y - r },
        { x: x - r, y },
      ]);
    case NodeShapeType.TRIANGLE:
      return polygon(triangleUpPoints(x, y, r));
    case NodeShapeType.TRIANGLE_DOWN:
      return polygon(triangleDownPoints(x, y, r));
    case NodeShapeType.STAR:
      return polygon(starPoints(x, y, r));
    case NodeShapeType.HEXAGON:
      return polygon(ngonPoints(x, y, r, 6));
    default:
      return { tag: 'circle', attributes: { cx: x, cy: y, r } };
  }
};

const triangleUpPoints = (x: number, y: number, r: number): IPosition[] => {
  r *= 1.15;
  y += 0.275 * r;

  const diameter = r * 2;
  const innerRadius = (Math.sqrt(3) * diameter) / 6;
  const height = Math.sqrt(diameter * diameter - r * r);

  return [
    { x, y: y - (height - innerRadius) },
    { x: x + r, y: y + innerRadius },
    { x: x - r, y: y + innerRadius },
  ];
};

const triangleDownPoints = (x: number, y: number, r: number): IPosition[] => {
  r *= 1.15;
  y -= 0.275 * r;

  const diameter = r * 2;
  const innerRadius = (Math.sqrt(3) * diameter) / 6;
  const height = Math.sqrt(diameter * diameter - r * r);

  return [
    { x, y: y + (height - innerRadius) },
    { x: x + r, y: y - innerRadius },
    { x: x - r, y: y - innerRadius },
  ];
};

const starPoints = (x: number, y: number, r: number): IPosition[] => {
  r *= 0.82;
  y += 0.1 * r;

  const points: IPosition[] = [];
  for (let n = 0; n < 10; n++) {
    const radius = r * (n % 2 === 0 ? 1.3 : 0.5);
    points.push({
      x: x + radius * Math.sin((n * 2 * Math.PI) / 10),
      y: y - radius * Math.cos((n * 2 * Math.PI) / 10),
    });
  }
  return points;
};

const ngonPoints = (x: number, y: number, r: number, sides: number): IPosition[] => {
  const points: IPosition[] = [];
  const arcSide = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    points.push({ x: x + r * Math.cos(arcSide * i), y: y + r * Math.sin(arcSide * i) });
  }
  return points;
};
