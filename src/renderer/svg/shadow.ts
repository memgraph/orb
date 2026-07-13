import { Color, IRectangle } from '../../common';
import { INodeStyle } from '../../models/node';
import { IEdgeStyle } from '../../models/edge';
import { SVGDefs } from './defs';
import { escapeXML, formatNumber } from './utils';

const SHADOW_STD_DEVIATION_RATIO = 0.5;

export interface IShadow {
  color: Color | string;
  size: number;
  offsetX: number;
  offsetY: number;
}

export const toShadow = (style: INodeStyle | IEdgeStyle): IShadow | null => {
  if (!style.shadowColor) {
    return null;
  }
  return {
    color: style.shadowColor,
    size: style.shadowSize ?? 0,
    offsetX: style.shadowOffsetX ?? 0,
    offsetY: style.shadowOffsetY ?? 0,
  };
};

export const shadowFilterId = (defs: SVGDefs, shadow: IShadow): string => {
  const { color, opacity } = parseColorAlpha(shadow.color.toString());
  const stdDeviation = Math.max(shadow.size * SHADOW_STD_DEVIATION_RATIO, 0);
  const signature = `shadow:${color}:${opacity}:${stdDeviation}:${shadow.offsetX}:${shadow.offsetY}`;

  return defs.add(signature, (id) =>
    buildShadowFilter(id, color, opacity, stdDeviation, shadow.offsetX, shadow.offsetY, defs.filterRegion),
  );
};

const buildShadowFilter = (
  id: string,
  color: string,
  opacity: number,
  stdDeviation: number,
  offsetX: number,
  offsetY: number,
  region?: IRectangle,
): string => {
  const regionAttributes = region
    ? `filterUnits="userSpaceOnUse" x="${formatNumber(region.x)}" y="${formatNumber(region.y)}" ` +
      `width="${formatNumber(region.width)}" height="${formatNumber(region.height)}"`
    : 'filterUnits="objectBoundingBox" x="-50%" y="-50%" width="200%" height="200%"';

  return (
    `<filter id="${escapeXML(id)}" ${regionAttributes}>` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${formatNumber(stdDeviation)}"/>` +
    `<feOffset dx="${formatNumber(offsetX)}" dy="${formatNumber(offsetY)}" result="offsetBlur"/>` +
    `<feFlood flood-color="${escapeXML(color)}" flood-opacity="${formatNumber(opacity)}"/>` +
    `<feComposite in2="offsetBlur" operator="in"/>` +
    `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`
  );
};

const parseColorAlpha = (color: string): { color: string; opacity: number } => {
  const rgba = color.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgba) {
    return { color: `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`, opacity: clamp01(Number(rgba[4])) };
  }

  const hex8 = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex8) {
    return { color: `#${hex8[1]}${hex8[2]}${hex8[3]}`, opacity: parseInt(hex8[4], 16) / 255 };
  }

  const hex4 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (hex4) {
    return { color: `#${hex4[1]}${hex4[2]}${hex4[3]}`, opacity: parseInt(hex4[4], 16) / 15 };
  }

  return { color, opacity: 1 };
};

const clamp01 = (value: number): number => {
  if (!isFinite(value)) {
    return 1;
  }
  return Math.min(Math.max(value, 0), 1);
};
