import { drawDiamond } from '../utils/shapes';
import { NodeShape } from '../base';

export class NodeShapeDiamond extends NodeShape {
  protected override drawShape(context: CanvasRenderingContext2D) {
    const center = this.getCenterPosition();
    const radius = this.getRadius();
    drawDiamond(context, center.x, center.y, radius);
  }
}
