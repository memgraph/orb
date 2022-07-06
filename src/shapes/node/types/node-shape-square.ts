import { drawSquare } from '../utils/shapes';
import { NodeShape } from '../base';
import { IPosition } from '../../../common/position';

export class NodeShapeSquare extends NodeShape {
  protected override drawShape(context: CanvasRenderingContext2D) {
    const center = this.getCenterPosition();
    const radius = this.getRadius();
    drawSquare(context, center.x, center.y, radius);
  }

  override includesPoint(point: IPosition): boolean {
    return this.isPointInBoundingBox(point);
  }
}
