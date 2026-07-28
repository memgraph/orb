import { INodeBase, INode } from '../../models/node';
import { IEdgeBase } from '../../models/edge';
import { ISVGDefs } from './defs';
import { ISVGShape } from './shapes';
import { svgElement } from './utils';

export const nodeImageToSVG = <N extends INodeBase, E extends IEdgeBase>(
  node: INode<N, E>,
  defs: ISVGDefs,
  shape: ISVGShape,
): string => {
  const image = node.getBackgroundImage();
  if (!image || !image.width || !image.height) {
    return '';
  }

  const href = resolveImageHref(node, image);
  if (!href) {
    return '';
  }

  const center = node.getCenter();
  const radius = node.getRadius();

  const clipGeometry = Object.keys(shape.attributes)
    .map((key) => `${key}=${shape.attributes[key]}`)
    .join(',');
  const clipId = defs.add(`clip:${shape.tag}:${clipGeometry}`, (id) =>
    svgElement('clipPath', { id }, svgElement(shape.tag, shape.attributes)),
  );

  return svgElement('image', {
    href,
    'xlink:href': href,
    x: center.x - radius,
    y: center.y - radius,
    width: radius * 2,
    height: radius * 2,
    preserveAspectRatio: 'xMidYMid slice',
    'clip-path': `url(#${clipId})`,
  });
};

const resolveImageHref = <N extends INodeBase, E extends IEdgeBase>(
  node: INode<N, E>,
  image: HTMLImageElement,
): string | undefined => {
  const dataUrl = imageToDataURL(image);
  if (dataUrl) {
    return dataUrl;
  }

  const style = node.getStyle();
  if (node.isSelected() && style.imageUrlSelected) {
    return style.imageUrlSelected;
  }
  return style.imageUrl ?? image.src ?? undefined;
};

const imageToDataURL = (image: HTMLImageElement): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }
    context.drawImage(image, 0, 0);
    return canvas.toDataURL();
  } catch {
    return undefined;
  }
};
