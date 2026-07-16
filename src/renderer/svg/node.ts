import { INodeBase, INode } from '../../models/node';
import { IEdgeBase } from '../../models/edge';
import { LabelTextBaseline } from '../canvas/label';
import { shapeToSVGShape } from './shapes';
import { labelToSVG } from './label';
import { nodeImageToSVG } from './image';
import { shadowFilterId, toShadow } from './shadow';
import { ISVGDefs } from './defs';
import { svgElement, ISVGAttributes } from './utils';

const DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE = 0.2;
const DEFAULT_NODE_COLOR = '#000000';
const DEFAULT_BORDER_COLOR = '#000000';

export interface INodeToSVGOptions {
  isLabelEnabled: boolean;
  isShadowEnabled: boolean;
  isImageEnabled: boolean;
}

export const nodeToSVG = <N extends INodeBase, E extends IEdgeBase>(
  node: INode<N, E>,
  defs: ISVGDefs,
  options?: Partial<INodeToSVGOptions>,
): string => {
  const isLabelEnabled = options?.isLabelEnabled ?? true;
  const isShadowEnabled = options?.isShadowEnabled ?? true;
  const isImageEnabled = options?.isImageEnabled ?? true;

  const center = node.getCenter();
  const radius = node.getRadius();
  if (radius <= 0) {
    return '';
  }

  const shape = shapeToSVGShape(node.getStyle().shape, center.x, center.y, radius);
  const color = (node.getColor() ?? DEFAULT_NODE_COLOR).toString();

  const hasBorder = node.hasBorder();
  const borderAttributes: ISVGAttributes = {};
  if (hasBorder) {
    borderAttributes.stroke = node.getBorderColor()?.toString() ?? DEFAULT_BORDER_COLOR;
    borderAttributes['stroke-width'] = node.getBorderWidth();
  }

  const image = isImageEnabled ? nodeImageToSVG(node, defs, shape) : '';
  const shadow = isShadowEnabled && node.hasShadow() ? toShadow(node.getStyle()) : null;

  let content: string;
  if (!image && !shadow) {
    content = svgElement(shape.tag, { ...shape.attributes, fill: color, ...borderAttributes });
  } else {
    const fill = svgElement(shape.tag, { ...shape.attributes, fill: color });
    let shadowed = `${fill}${image}`;
    if (shadow) {
      shadowed = svgElement('g', { filter: `url(#${shadowFilterId(defs, shadow)})` }, shadowed);
    }
    const border = hasBorder ? svgElement(shape.tag, { ...shape.attributes, fill: 'none', ...borderAttributes }) : '';
    content = `${shadowed}${border}`;
  }

  const label = isLabelEnabled ? nodeLabelToSVG(node) : '';

  return svgElement('g', {}, `${content}${label}`);
};

const nodeLabelToSVG = <N extends INodeBase, E extends IEdgeBase>(node: INode<N, E>): string => {
  const nodeLabel = node.getLabel();
  if (!nodeLabel) {
    return '';
  }

  const center = node.getCenter();
  const distance = node.getBorderedRadius() * (1 + DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE);
  const nodeStyle = node.getStyle();

  return labelToSVG(nodeLabel, {
    position: { x: center.x, y: center.y + distance },
    textBaseline: LabelTextBaseline.TOP,
    properties: {
      fontBackgroundColor: nodeStyle.fontBackgroundColor,
      fontColor: nodeStyle.fontColor,
      fontFamily: nodeStyle.fontFamily,
      fontSize: nodeStyle.fontSize,
    },
  });
};
