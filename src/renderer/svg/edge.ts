import { INodeBase } from '../../models/node';
import { IEdge, IEdgeBase, EdgeStraight, EdgeCurved, EdgeLoopback } from '../../models/edge';
import { IPosition } from '../../common';
import { LabelTextBaseline } from '../canvas/label';
import { IEdgeArrow } from '../canvas/edge/shared';
import { getStraightArrowShape } from '../canvas/edge/types/edge-straight';
import { getCurvedArrowShape } from '../canvas/edge/types/edge-curved';
import { getLoopbackArrowShape } from '../canvas/edge/types/edge-loopback';
import { labelToSVG } from './label';
import { shadowFilterId, toShadow } from './shadow';
import { ISVGDefs } from './defs';
import { formatNumber, svgElement, ISVGAttributes } from './utils';

const DEFAULT_EDGE_COLOR = '#000000';

const ARROW_KEY_POINTS: IPosition[] = [
  { x: 0, y: 0 },
  { x: -1, y: 0.4 },
  { x: -1, y: -0.4 },
];

export interface IEdgeToSVGOptions {
  isLabelEnabled: boolean;
  isShadowEnabled: boolean;
}

export const edgeToSVG = <N extends INodeBase, E extends IEdgeBase>(
  edge: IEdge<N, E>,
  defs: ISVGDefs,
  options?: Partial<IEdgeToSVGOptions>,
): string => {
  const width = edge.getWidth();
  if (!width) {
    return '';
  }

  const isLabelEnabled = options?.isLabelEnabled ?? true;
  const isShadowEnabled = options?.isShadowEnabled ?? true;
  const color = (edge.getColor() ?? DEFAULT_EDGE_COLOR).toString();

  const arrow = edgeArrowToSVG(edge, color);
  const line = edgeLineToSVG(edge, width, color);

  const shadow = isShadowEnabled && edge.hasShadow() ? toShadow(edge.getStyle()) : null;

  let content = `${arrow}${line}`;
  if (shadow) {
    content = svgElement('g', { filter: `url(#${shadowFilterId(defs, shadow)})` }, content);
  }

  const label = isLabelEnabled ? edgeLabelToSVG(edge) : '';

  return svgElement('g', {}, `${content}${label}`);
};

const edgeLineToSVG = <N extends INodeBase, E extends IEdgeBase>(
  edge: IEdge<N, E>,
  width: number,
  color: string,
): string => {
  const dashPattern = edge.getLineDashPattern();
  const strokeAttributes: ISVGAttributes = {
    stroke: color,
    'stroke-width': width,
    fill: 'none',
    'stroke-dasharray': dashPattern ? dashPattern.join(' ') : undefined,
  };

  if (edge instanceof EdgeStraight) {
    const source = edge.startNode.getCenter();
    const target = edge.endNode.getCenter();
    const d = `M ${formatNumber(source.x)} ${formatNumber(source.y)} L ${formatNumber(target.x)} ${formatNumber(
      target.y,
    )}`;
    return svgElement('path', { d, ...strokeAttributes });
  }

  if (edge instanceof EdgeCurved) {
    const source = edge.startNode.getCenter();
    const target = edge.endNode.getCenter();
    const control = edge.getCurvedControlPoint();
    const d = `M ${formatNumber(source.x)} ${formatNumber(source.y)} Q ${formatNumber(control.x)} ${formatNumber(
      control.y,
    )} ${formatNumber(target.x)} ${formatNumber(target.y)}`;
    return svgElement('path', { d, ...strokeAttributes });
  }

  if (edge instanceof EdgeLoopback) {
    const { x, y, radius } = edge.getCircularData();
    return svgElement('circle', { cx: x, cy: y, r: radius, ...strokeAttributes });
  }

  return '';
};

const edgeArrowToSVG = <N extends INodeBase, E extends IEdgeBase>(edge: IEdge<N, E>, color: string): string => {
  if (edge.getStyle().arrowSize === 0) {
    return '';
  }

  const arrowShape = getArrowShape(edge);
  if (!arrowShape) {
    return '';
  }

  const points = transformArrowPoints(ARROW_KEY_POINTS, arrowShape);
  const pointsAttribute = points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(' ');

  return svgElement('polygon', { points: pointsAttribute, fill: color });
};

const getArrowShape = <N extends INodeBase, E extends IEdgeBase>(edge: IEdge<N, E>): IEdgeArrow | null => {
  if (edge instanceof EdgeStraight) {
    return getStraightArrowShape(edge);
  }
  if (edge instanceof EdgeCurved) {
    return getCurvedArrowShape(edge);
  }
  if (edge instanceof EdgeLoopback) {
    return getLoopbackArrowShape(edge);
  }
  return null;
};

const transformArrowPoints = (points: IPosition[], arrow: IEdgeArrow): IPosition[] => {
  return points.map((point) => {
    const xt = point.x * Math.cos(arrow.angle) - point.y * Math.sin(arrow.angle);
    const yt = point.x * Math.sin(arrow.angle) + point.y * Math.cos(arrow.angle);
    return {
      x: arrow.point.x + arrow.length * xt,
      y: arrow.point.y + arrow.length * yt,
    };
  });
};

const edgeLabelToSVG = <N extends INodeBase, E extends IEdgeBase>(edge: IEdge<N, E>): string => {
  const edgeLabel = edge.getLabel();
  if (!edgeLabel) {
    return '';
  }

  const edgeStyle = edge.getStyle();

  return labelToSVG(edgeLabel, {
    position: edge.getCenter(),
    textBaseline: LabelTextBaseline.MIDDLE,
    properties: {
      fontBackgroundColor: edgeStyle.fontBackgroundColor,
      fontColor: edgeStyle.fontColor,
      fontFamily: edgeStyle.fontFamily,
      fontSize: edgeStyle.fontSize,
    },
  });
};
