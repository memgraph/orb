import { INode, INodeBase } from '../../models/node';
import { IEdge, IEdgeBase, EdgeCurved, EdgeLoopback } from '../../models/edge';
import { IGraph } from '../../models/graph';
import { Color, IRectangle } from '../../common';
import { nodeToSVG } from './node';
import { edgeToSVG } from './edge';
import { SVGDefs } from './defs';
import { formatNumber, svgElement } from './utils';

const DEFAULT_PADDING = 20;
const DEFAULT_FONT_SIZE = 4;
const LABEL_DISTANCE_RATIO = 0.2;
const FONT_LINE_SPACING = 1.2;
const FONT_BACKGROUND_MARGIN = 0.12;
const AVERAGE_GLYPH_WIDTH_RATIO = 0.6;

export interface ISVGExportOptions {
  backgroundColor?: Color | string | null;
  padding?: number;
  isLabelEnabled?: boolean;
  isShadowEnabled?: boolean;
  isImageEnabled?: boolean;
}

export const graphToSVG = <N extends INodeBase, E extends IEdgeBase>(
  graph: IGraph<N, E>,
  options: ISVGExportOptions = {},
): string => {
  const padding = options.padding ?? DEFAULT_PADDING;
  const isLabelEnabled = options.isLabelEnabled ?? true;
  const isShadowEnabled = options.isShadowEnabled ?? true;
  const isImageEnabled = options.isImageEnabled ?? true;

  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  const content = computeContentBounds(nodes, edges, isLabelEnabled, isShadowEnabled);
  const minX = content.x - padding;
  const minY = content.y - padding;
  const width = Math.max(content.width + padding * 2, 1);
  const height = Math.max(content.height + padding * 2, 1);
  const region: IRectangle = { x: minX, y: minY, width, height };

  const defs = new SVGDefs(region);
  const body: string[] = [];

  if (options.backgroundColor) {
    body.push(svgElement('rect', { x: minX, y: minY, width, height, fill: options.backgroundColor.toString() }));
  }

  for (let i = 0; i < edges.length; i++) {
    body.push(edgeToSVG(edges[i], defs, { isLabelEnabled, isShadowEnabled }));
  }
  for (let i = 0; i < nodes.length; i++) {
    body.push(nodeToSVG(nodes[i], defs, { isLabelEnabled, isShadowEnabled, isImageEnabled }));
  }

  const viewBox = `${formatNumber(minX)} ${formatNumber(minY)} ${formatNumber(width)} ${formatNumber(height)}`;

  return svgElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
      viewBox,
      width,
      height,
    },
    `${defs.toSVG()}${body.join('')}`,
  );
};

interface IMutableBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const computeContentBounds = <N extends INodeBase, E extends IEdgeBase>(
  nodes: INode<N, E>[],
  edges: IEdge<N, E>[],
  isLabelEnabled: boolean,
  isShadowEnabled: boolean,
): IRectangle => {
  const bounds: IMutableBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  for (let i = 0; i < nodes.length; i++) {
    includeNode(bounds, nodes[i], isLabelEnabled, isShadowEnabled);
  }
  for (let i = 0; i < edges.length; i++) {
    includeEdge(bounds, edges[i], isLabelEnabled, isShadowEnabled);
  }

  if (!isFinite(bounds.minX)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return { x: bounds.minX, y: bounds.minY, width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
};

const includePoint = (bounds: IMutableBounds, x: number, y: number): void => {
  if (x < bounds.minX) {
    bounds.minX = x;
  }
  if (y < bounds.minY) {
    bounds.minY = y;
  }
  if (x > bounds.maxX) {
    bounds.maxX = x;
  }
  if (y > bounds.maxY) {
    bounds.maxY = y;
  }
};

const includeBox = (bounds: IMutableBounds, cx: number, cy: number, halfWidth: number, halfHeight: number): void => {
  includePoint(bounds, cx - halfWidth, cy - halfHeight);
  includePoint(bounds, cx + halfWidth, cy + halfHeight);
};

const includeNode = <N extends INodeBase, E extends IEdgeBase>(
  bounds: IMutableBounds,
  node: INode<N, E>,
  isLabelEnabled: boolean,
  isShadowEnabled: boolean,
): void => {
  if (node.getRadius() <= 0) {
    return;
  }

  const center = node.getCenter();
  const radius = node.getBorderedRadius();
  const pad = isShadowEnabled ? shadowReach(node.hasShadow(), node.getStyle()) : 0;
  includeBox(bounds, center.x, center.y, radius + pad, radius + pad);

  if (isLabelEnabled && node.getLabel()) {
    const style = node.getStyle();
    const top = center.y + node.getBorderedRadius() * (1 + LABEL_DISTANCE_RATIO);
    includeLabelBox(bounds, node.getLabel() as string, center.x, top, style.fontSize ?? DEFAULT_FONT_SIZE, false);
  }
};

const includeEdge = <N extends INodeBase, E extends IEdgeBase>(
  bounds: IMutableBounds,
  edge: IEdge<N, E>,
  isLabelEnabled: boolean,
  isShadowEnabled: boolean,
): void => {
  if (!edge.getWidth()) {
    return;
  }

  const style = edge.getStyle();
  const pad = isShadowEnabled ? shadowReach(edge.hasShadow(), style) : 0;

  if (edge instanceof EdgeLoopback) {
    const circle = edge.getCircularData();
    includeBox(bounds, circle.x, circle.y, circle.radius + pad, circle.radius + pad);
  } else if (edge instanceof EdgeCurved) {
    const control = edge.getCurvedControlPoint();
    includeBox(bounds, control.x, control.y, pad, pad);
  }

  if (isLabelEnabled && edge.getLabel()) {
    const center = edge.getCenter();
    includeLabelBox(bounds, edge.getLabel() as string, center.x, center.y, style.fontSize ?? DEFAULT_FONT_SIZE, true);
  }
};

const includeLabelBox = (
  bounds: IMutableBounds,
  text: string,
  cx: number,
  y: number,
  fontSize: number,
  isCentered: boolean,
): void => {
  if (fontSize <= 0) {
    return;
  }
  const lines = `${text}`.split('\n');
  const maxLength = lines.reduce((max, line) => Math.max(max, line.trim().length), 0);
  const margin = fontSize * FONT_BACKGROUND_MARGIN;
  const width = maxLength * fontSize * AVERAGE_GLYPH_WIDTH_RATIO + 2 * margin;
  const height = lines.length * fontSize * FONT_LINE_SPACING + 2 * margin;
  const top = isCentered ? y - height / 2 : y;
  includePoint(bounds, cx - width / 2, top);
  includePoint(bounds, cx + width / 2, top + height);
};

const shadowReach = (
  hasShadow: boolean,
  style: { shadowColor?: Color | string; shadowSize?: number; shadowOffsetX?: number; shadowOffsetY?: number },
): number => {
  if (!hasShadow || !style.shadowColor) {
    return 0;
  }
  return (style.shadowSize ?? 0) + Math.max(Math.abs(style.shadowOffsetX ?? 0), Math.abs(style.shadowOffsetY ?? 0));
};
