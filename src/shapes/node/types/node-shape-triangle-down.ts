import { drawTriangleDown } from '../utils/shapes';
import { NodeShape } from '../base';

export class NodeShapeTriangleDown extends NodeShape {
  protected override drawShape(context: CanvasRenderingContext2D) {
    const center = this.getCenterPosition();
    const radius = this.getRadius();
    drawTriangleDown(context, center.x, center.y, radius);
  }
}
