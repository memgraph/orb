import { INodeBase } from '../../../models/node';
import { Edge, IEdgeBase } from '../../../models/edge';
import { EdgeStraightCanvas } from './types/edge-straight';
import { EdgeCanvas } from './base';
import { EdgeCurvedCanvas } from './types/edge-curved';
import { EdgeLoopbackCanvas } from './types/edge-loopback';

export class EdgeCanvasFactory {
  static createEdgeCanvas<N extends INodeBase, E extends IEdgeBase>(edge: Edge<N, E>): EdgeCanvas<N, E> {
    if (edge.isLoopback()) {
      return new EdgeLoopbackCanvas<N, E>(edge);
    }
    if (edge.isStraight()) {
      return new EdgeStraightCanvas<N, E>(edge);
    }
    if (edge.isCurved()) {
      return new EdgeCurvedCanvas<N, E>(edge);
    }

    return new EdgeCanvas<N, E>(edge);
  }
}
