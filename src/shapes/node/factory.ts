import { INodeShape } from './interface';
import { NodeShapeCircle } from './types/node-shape-circle';
import { NodeShapeSquare } from './types/node-shape-square';
import { NodeShapeDiamond } from './types/node-shape-diamond';
import { NodeShapeTriangleUp } from './types/node-shape-triangle-up';
import { NodeShapeTriangleDown } from './types/node-shape-triangle-down';
import { NodeShapeStar } from './types/node-shape-star';
import { NodeShapeHexagon } from './types/node-shape-hexagon';
import { INodeShapeDefinition, NodeShape } from './base';

export class NodeShapeFactory {
  static createNodeShape(definition: INodeShapeDefinition): INodeShape {
    const shapeType = definition.style?.shape;
    if (!shapeType || shapeType === 'dot') {
      return new NodeShapeCircle(definition);
    }
    if (shapeType === 'square') {
      return new NodeShapeSquare(definition);
    }
    if (shapeType === 'diamond') {
      return new NodeShapeDiamond(definition);
    }
    if (shapeType === 'triangle') {
      return new NodeShapeTriangleUp(definition);
    }
    if (shapeType === 'triangleDown') {
      return new NodeShapeTriangleDown(definition);
    }
    if (shapeType === 'star') {
      return new NodeShapeStar(definition);
    }
    if (shapeType === 'hexagon') {
      return new NodeShapeHexagon(definition);
    }

    // Default
    return new NodeShape(definition);
  }
}
