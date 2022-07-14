import { INodeBase } from '../../../../models/node';
import { IEdgeBase } from '../../../../models/edge';
import { drawTriangleDown } from '../utils/shapes';
import { NodeCanvas } from '../base';

export class NodeTriangleDownCanvas<N extends INodeBase, E extends IEdgeBase> extends NodeCanvas<N, E> {
  protected override drawShape(context: CanvasRenderingContext2D) {
    const center = this.node.getCenter();
    const radius = this.node.getRadius();
    drawTriangleDown(context, center.x, center.y, radius);
  }
}
