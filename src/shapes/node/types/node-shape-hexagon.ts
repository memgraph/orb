import { drawHexagon } from '../utils/shapes';
import { NodeShape } from '../base';

export class NodeShapeHexagon extends NodeShape {
  protected override drawShape(context: CanvasRenderingContext2D) {
    const center = this.getCenterPosition();
    const radius = this.getRadius();
    drawHexagon(context, center.x, center.y, radius);
  }
}
