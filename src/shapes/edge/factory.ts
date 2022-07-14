import { EdgeShapeLoopback } from './types/edge-shape-loopback';
import { EdgeShapeStraight } from './types/edge-shape-straight';
import { EdgeShapeCurved } from './types/edge-shape-curved';
import { EdgeShape, IEdgeShapeDefinition } from './base';
import { EdgeLineStyleType } from './interface';
import { IEdgeBase, INodeBase } from '../../models/graph.model';

export class EdgeShapeFactory {
  static createEdgeShape<N extends INodeBase, E extends IEdgeBase>(definition: IEdgeShapeDefinition<N, E>) {
    if (definition.sourceNodeShape.getId() === definition.targetNodeShape.getId()) {
      return new EdgeShapeLoopback<N, E>(definition);
    }
    if (definition.style?.type === EdgeLineStyleType.STRAIGHT) {
      return new EdgeShapeStraight<N, E>(definition);
    }
    if (definition.style?.type === EdgeLineStyleType.CURVED && definition.style?.roundness !== undefined) {
      return new EdgeShapeCurved<N, E>(definition);
    }

    // Default
    return new EdgeShape<N, E>(definition);
  }
}
