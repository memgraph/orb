import { drawTriangleUp } from '../utils/shapes';
import { NodeShape } from '../base';

export class NodeShapeTriangleUp extends NodeShape {
  protected override drawShape(context: CanvasRenderingContext2D) {
    const center = this.getCenterPosition();
    const radius = this.getRadius();
    drawTriangleUp(context, center.x, center.y, radius);
  }
}
