import { drawStar } from '../utils/shapes';
import { NodeShape } from '../base';

export class NodeShapeStar extends NodeShape {
  protected override drawShape(context: CanvasRenderingContext2D) {
    const center = this.getCenterPosition();
    const radius = this.getRadius();
    drawStar(context, center.x, center.y, radius);
  }
}
