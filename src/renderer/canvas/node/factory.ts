import { INodeBase, Node, NodeShapeType } from '../../../models/node';
import { IEdgeBase } from '../../../models/edge';
import { NodeCanvas } from './base';
import { NodeCircleCanvas } from './types/node-circle';
import { NodeSquareCanvas } from './types/node-square';
import { NodeDiamondCanvas } from './types/node-diamond';
import { NodeTriangleUpCanvas } from './types/node-triangle-up';
import { NodeTriangleDownCanvas } from './types/node-triangle-down';
import { NodeStarCanvas } from './types/node-star';
import { NodeHexagonCanvas } from './types/node-hexagon';

export class NodeCanvasFactory {
  static createNodeCanvas<N extends INodeBase, E extends IEdgeBase>(node: Node<N, E>): NodeCanvas<N, E> {
    const shapeType = node.properties.shape;
    if (!shapeType || shapeType === NodeShapeType.CIRCLE || shapeType === NodeShapeType.DOT) {
      return new NodeCircleCanvas<N, E>(node);
    }
    if (shapeType === NodeShapeType.SQUARE) {
      return new NodeSquareCanvas<N, E>(node);
    }
    if (shapeType === NodeShapeType.DIAMOND) {
      return new NodeDiamondCanvas<N, E>(node);
    }
    if (shapeType === NodeShapeType.TRIANGLE) {
      return new NodeTriangleUpCanvas<N, E>(node);
    }
    if (shapeType === NodeShapeType.TRIANGLE_DOWN) {
      return new NodeTriangleDownCanvas<N, E>(node);
    }
    if (shapeType === NodeShapeType.STAR) {
      return new NodeStarCanvas<N, E>(node);
    }
    if (shapeType === NodeShapeType.HEXAGON) {
      return new NodeHexagonCanvas<N, E>(node);
    }

    // Default
    return new NodeCanvas<N, E>(node);
  }
}
