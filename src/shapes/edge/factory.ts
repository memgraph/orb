import { EdgeShapeLoopback } from './types/edge-shape-loopback';
import { EdgeShapeStraight } from './types/edge-shape-straight';
import { EdgeShapeCurved } from './types/edge-shape-curved';
import { EdgeShape, IEdgeShapeDefinition } from './base';
import { EdgeLineStyleType } from './interface';

export class EdgeShapeFactory {
  static createEdgeShape(definition: IEdgeShapeDefinition) {
    if (definition.sourceNodeShape.getId() === definition.targetNodeShape.getId()) {
      return new EdgeShapeLoopback(definition);
    }
    if (definition.style?.type === EdgeLineStyleType.STRAIGHT) {
      return new EdgeShapeStraight(definition);
    }
    if (definition.style?.type === EdgeLineStyleType.CURVED && definition.style?.roundness !== undefined) {
      return new EdgeShapeCurved(definition);
    }

    // Default
    return new EdgeShape(definition);
  }
}
