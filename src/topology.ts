import { EdgeLineStyleType, EdgeShapeState, IEdgeShape, IEdgeStyle } from './shapes/edge/interface';
import { INodeShape, INodeStyle, NodeShapeState } from './shapes/node/interface';
import { NodeShapeFactory } from './shapes/node/factory';
import { EdgeShapeFactory } from './shapes/edge/factory';
import { IPosition } from './common/position';
import { IGraph, IGraphEdge } from './models/graph.model';
import { ISimulationNode } from './simulator/interface';
import { ImageHandler } from './images';
import { IRectangle } from './common/rectangle';

type IEdgeOffsetsByUniqueKey = Record<string, number[]>;

interface IEdgeStyleOffset {
  type: EdgeLineStyleType;
  roundness: number;
}

type IEdgeShapeFilter = (edgeShape: IEdgeShape) => boolean;

type INodeShapeFilter = (nodeShape: INodeShape) => boolean;

export interface IGraphTopologyDrawOptions {
  labelsIsEnabled: boolean;
  labelsOnEventIsEnabled: boolean;
  contextAlphaOnEvent: number;
  contextAlphaOnEventIsEnabled: boolean;
}

export interface IGraphTopologyOptions {
  graph: IGraph;
  style?: IGraphStyle;
}

const DEFAULT_DRAW_OPTIONS: IGraphTopologyDrawOptions = {
  labelsIsEnabled: true,
  labelsOnEventIsEnabled: true,
  contextAlphaOnEvent: 0.3,
  contextAlphaOnEventIsEnabled: true,
};

export interface GraphTopologyStyleCallbackOptions {
  onImageLoaded?: () => void;
}

export interface IGraphStyle {
  nodeStyleById: Record<number, INodeStyle>;
  edgeStyleById: Record<number, IEdgeStyle>;
}

export class GraphTopology {
  protected graph: IGraph;
  protected style?: IGraphStyle;

  protected nodeShapeById: Record<number, INodeShape> = {};
  protected edgeShapeById: Record<number, IEdgeShape> = {};
  protected edgeStyleOffsetById: Record<number, IEdgeStyleOffset> = {};

  constructor(options: IGraphTopologyOptions) {
    this.graph = options.graph;
    this.style = options.style;

    this.setGraph(options.graph);
    if (options.style) {
      this.setStyle(options.style);
    }
  }

  getNodeShapeById(id: number): INodeShape | undefined {
    return this.nodeShapeById[id];
  }

  getNodeShapes(filterBy?: INodeShapeFilter): INodeShape[] {
    const nodeShapes = Object.values(this.nodeShapeById);
    if (!filterBy) {
      return nodeShapes;
    }

    const filteredNodeShapes: INodeShape[] = [];
    for (let i = 0; i < nodeShapes.length; i++) {
      if (filterBy(nodeShapes[i])) {
        filteredNodeShapes.push(nodeShapes[i]);
      }
    }
    return filteredNodeShapes;
  }

  setNodePositions(positions: ISimulationNode[]) {
    for (let i = 0; i < positions.length; i++) {
      this.nodeShapeById[positions[i].id]?.setPosition(positions[i]);
    }
  }

  getNodePositions(): ISimulationNode[] {
    const nodeShapes = this.getNodeShapes();
    const positions: ISimulationNode[] = new Array<ISimulationNode>(nodeShapes.length);
    for (let i = 0; i < nodeShapes.length; i++) {
      positions[i] = nodeShapes[i].getPosition();
    }
    return positions;
  }

  getEdgePositions() {
    return [];
  }

  getEdgeShapeById(id: number): IEdgeShape | undefined {
    return this.edgeShapeById[id];
  }

  getEdgeShapes(filterBy?: IEdgeShapeFilter): IEdgeShape[] {
    const edgeShapes = Object.values(this.edgeShapeById);
    if (!filterBy) {
      return edgeShapes;
    }

    const filteredEdgeShapes: IEdgeShape[] = [];
    for (let i = 0; i < edgeShapes.length; i++) {
      if (filterBy(edgeShapes[i])) {
        filteredEdgeShapes.push(edgeShapes[i]);
      }
    }
    return filteredEdgeShapes;
  }

  setGraph(graph: IGraph) {
    this.graph = graph;

    const existingNodeIds = objectKeys(this.nodeShapeById);
    for (let i = 0; i < existingNodeIds.length; i++) {
      const nodeId = existingNodeIds[i];
      if (!graph.getNodeById(nodeId)) {
        delete this.nodeShapeById[nodeId];
      }
    }

    for (let i = 0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i];
      if (this.nodeShapeById[node.id]) {
        continue;
      }

      const nodeStyle = this.style?.nodeStyleById?.[node.id];
      const nodePosition: ISimulationNode = {
        id: node.id,
        mass: nodeStyle?.mass,
      };
      this.nodeShapeById[node.id] = NodeShapeFactory.createNodeShape({
        data: node,
        position: nodePosition,
        style: nodeStyle,
      });
    }

    this.edgeStyleOffsetById = getEdgeStyleOffsetById(graph.edges);

    const existingEdgeIds = objectKeys(this.edgeShapeById);
    for (let i = 0; i < existingEdgeIds.length; i++) {
      const edgeId = existingEdgeIds[i];
      if (!graph.getEdgeById(edgeId)) {
        delete this.edgeShapeById[edgeId];
      }
    }

    for (let i = 0; i < graph.edges.length; i++) {
      const edge = graph.edges[i];
      const sourceNodeShape = this.nodeShapeById[edge.start];
      const targetNodeShape = this.nodeShapeById[edge.end];
      const edgeStyleOffset = this.edgeStyleOffsetById[edge.id];

      if (!sourceNodeShape || !targetNodeShape || !edgeStyleOffset) {
        continue;
      }

      const edgeStyle = this.style?.edgeStyleById?.[edge.id];
      this.edgeShapeById[edge.id] = EdgeShapeFactory.createEdgeShape({
        data: edge,
        style: { ...edgeStyle, ...edgeStyleOffset },
        sourceNodeShape,
        targetNodeShape,
      });
    }
  }

  setStyle(style: IGraphStyle, callbackOptions?: GraphTopologyStyleCallbackOptions) {
    this.style = style;
    const styleImageUrls: Set<string> = new Set<string>();

    const nodeShapes = this.getNodeShapes();
    for (let i = 0; i < nodeShapes.length; i++) {
      const nodeShape = nodeShapes[i];
      const nodeId = nodeShape.getId();

      const newStyle = this.style.nodeStyleById[nodeId];
      if (newStyle.imageUrl) {
        styleImageUrls.add(newStyle.imageUrl);
      }
      if (newStyle.imageUrlSelected) {
        styleImageUrls.add(newStyle.imageUrlSelected);
      }

      const existingPosition = nodeShape.getPosition();
      existingPosition.mass = newStyle?.mass;

      this.nodeShapeById[nodeId] = NodeShapeFactory.createNodeShape({
        data: nodeShape.getData(),
        position: existingPosition,
        style: newStyle,
      });
    }

    const edgeShapes = this.getEdgeShapes();
    for (let i = 0; i < edgeShapes.length; i++) {
      const edgeShape = edgeShapes[i];
      const edgeId = edgeShape.getId();

      const existingStyleOffset: IEdgeStyleOffset = {
        type: (edgeShape.getStyle?.()?.type as EdgeLineStyleType) ?? EdgeLineStyleType.STRAIGHT,
        roundness: edgeShape.getStyle?.()?.roundness ?? 0,
      };
      this.edgeShapeById[edgeId] = EdgeShapeFactory.createEdgeShape({
        data: edgeShape.getData(),
        style: { ...style.edgeStyleById[edgeId], ...existingStyleOffset },
        sourceNodeShape: this.nodeShapeById[edgeShape.getSourceNodeShape().getId()],
        targetNodeShape: this.nodeShapeById[edgeShape.getTargetNodeShape().getId()],
      });
    }

    if (styleImageUrls.size) {
      ImageHandler.getInstance().loadImages(Array.from(styleImageUrls), () => callbackOptions?.onImageLoaded?.());
    }
  }

  getViewRectangle(): IRectangle {
    const nodeShapes = this.getNodeShapes();
    const minPoint: IPosition = { x: 0, y: 0 };
    const maxPoint: IPosition = { x: 0, y: 0 };

    for (let i = 0; i < nodeShapes.length; i++) {
      const { x, y } = nodeShapes[i].getPosition();

      if (x === undefined || y === undefined) {
        continue;
      }

      const size = nodeShapes[i].getBorderedRadius();

      if (i === 0) {
        minPoint.x = x - size;
        maxPoint.x = x + size;
        minPoint.y = y - size;
        maxPoint.y = y + size;
        continue;
      }

      if (x + size > maxPoint.x) {
        maxPoint.x = x + size;
      }
      if (x - size < minPoint.x) {
        minPoint.x = x - size;
      }
      if (y + size > maxPoint.y) {
        maxPoint.y = y + size;
      }
      if (y - size < minPoint.y) {
        minPoint.y = y - size;
      }
    }

    return {
      x: minPoint.x,
      y: minPoint.y,
      width: Math.abs(maxPoint.x - minPoint.x),
      height: Math.abs(maxPoint.y - minPoint.y),
    };
  }

  draw(context: CanvasRenderingContext2D, options?: Partial<IGraphTopologyDrawOptions>) {
    this.drawShapes(context, this.getEdgeShapes(), options);
    this.drawShapes(context, this.getNodeShapes(), options);
  }

  protected drawShapes(
    context: CanvasRenderingContext2D,
    shapes: (INodeShape | IEdgeShape)[],
    options?: Partial<IGraphTopologyDrawOptions>,
  ) {
    const drawOptions = Object.assign(DEFAULT_DRAW_OPTIONS, options);
    // TODO: Have a single IShape and IShapeState!
    const selectedShapes: (INodeShape | IEdgeShape)[] = [];
    const hoveredShapes: (INodeShape | IEdgeShape)[] = [];

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      if (shape.isSelected()) {
        selectedShapes.push(shape);
      }
      if (shape.isHovered()) {
        hoveredShapes.push(shape);
      }
    }
    const hasStateChangedShapes = selectedShapes.length || hoveredShapes.length;

    if (drawOptions.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      context.globalAlpha = drawOptions.contextAlphaOnEvent;
    }

    for (let i = 0; i < shapes.length; i++) {
      if (!shapes[i].isSelected() && !shapes[i].isHovered()) {
        shapes[i].draw(context, { isLabelEnabled: drawOptions.labelsIsEnabled });
      }
    }

    if (drawOptions.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      context.globalAlpha = 1;
    }

    for (let i = 0; i < selectedShapes.length; i++) {
      selectedShapes[i].draw(context, { isLabelEnabled: drawOptions.labelsOnEventIsEnabled });
    }
    for (let i = 0; i < hoveredShapes.length; i++) {
      hoveredShapes[i].draw(context, { isLabelEnabled: drawOptions.labelsOnEventIsEnabled });
    }
  }

  // TODO: Return this code when we will have LabelViewPortStrategy implemented
  // getLabelledShapes(activeView: IRectangle, maxActiveNodes = 150) {
  //   // TODO: Check if label is drawable and for active view use renderer.getSimulationViewRectangle();
  //   const labelledNodeShapes = this.getNodeShapes((shape) => !!shape.getLabel());
  //
  //   if (labelledNodeShapes.length <= maxActiveNodes) {
  //     return { drawLabelsForAll: true };
  //   }
  //
  //   let activeViewNodeShapeCount = 0;
  //   for (let i = 0; i < labelledNodeShapes.length; i++) {
  //     if (!isPointInRectangle(activeView, labelledNodeShapes[i].getCenterPosition())) {
  //       continue;
  //     }
  //     activeViewNodeShapeCount += 1;
  //
  //     // No need to count further
  //     if (activeViewNodeShapeCount > maxActiveNodes) {
  //       return { drawLabelsForAll: false };
  //     }
  //   }
  //
  //   // TODO: Check if edge is drawable
  //   const labelledEdgeShapes = this.getEdgeShapes((shape) => !!shape.getLabel());
  //   if (labelledEdgeShapes.length > 0) {
  //     const labelledNodeShapeIds = new Set<number>(labelledNodeShapes.map((shape) => shape.getId()));
  //     labelledEdgeShapes = labelledEdgeShapes.filter((shape) => {
  //       const sourceNodeShapeId = shape.getSourceNodeShape().getId();
  //       const targetNodeShapeId = shape.getTargetNodeShape().getId();
  //       return labelledNodeShapeIds.has(sourceNodeShapeId) || labelledNodeShapeIds.has(targetNodeShapeId);
  //     });
  //     return [...labelledNodeShapes, ...labelledEdgeShapes];
  //   }
  //   return labelledNodeShapes;
  // }

  getNearestNodeShape(point: IPosition): INodeShape | undefined {
    // Reverse is needed to check from the top drawn to the bottom drawn node
    const nodeShapes = this.getNodeShapes();
    for (let i = nodeShapes.length - 1; i >= 0; i--) {
      if (nodeShapes[i].includesPoint(point)) {
        return nodeShapes[i];
      }
    }
  }

  getNearestEdgeShape(point: IPosition, minDistance = 3): IEdgeShape | undefined {
    let nearestShape: IEdgeShape | undefined;
    let nearestDistance = minDistance;

    const edgeShapes = this.getEdgeShapes();
    for (let i = 0; i < edgeShapes.length; i++) {
      const distance = edgeShapes[i].getDistance(point);
      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearestShape = edgeShapes[i];
      }
    }
    return nearestShape;
  }

  selectNodeShape(nodeShape: INodeShape) {
    this.unselectAll();
    setNodeShapeState(nodeShape, NodeShapeState.SELECT, { isStateOverride: true });
  }

  selectEdgeShape(edgeShape: IEdgeShape) {
    this.unselectAll();
    setEdgeShapeState(edgeShape, EdgeShapeState.SELECT, { isStateOverride: true });
  }

  unselectAll(): { changedShapeCount: number } {
    const selectedNodeShapes = this.getNodeShapes((shape) => shape.isSelected());
    for (let i = 0; i < selectedNodeShapes.length; i++) {
      selectedNodeShapes[i].clearState();
    }

    const selectedEdgeShapes = this.getEdgeShapes((shape) => shape.isSelected());
    for (let i = 0; i < selectedEdgeShapes.length; i++) {
      selectedEdgeShapes[i].clearState();
    }

    return { changedShapeCount: selectedNodeShapes.length + selectedEdgeShapes.length };
  }

  hoverNodeShape(nodeShape: INodeShape) {
    this.unhoverAll();
    setNodeShapeState(nodeShape, NodeShapeState.HOVER);
  }

  hoverEdgeShape(edgeShape: IEdgeShape) {
    this.unhoverAll();
    setEdgeShapeState(edgeShape, EdgeShapeState.HOVER);
  }

  unhoverAll(): { changedShapeCount: number } {
    const hoveredNodeShapes = this.getNodeShapes((shape) => shape.isHovered());
    for (let i = 0; i < hoveredNodeShapes.length; i++) {
      hoveredNodeShapes[i].clearState();
    }

    const hoveredEdgeShapes = this.getEdgeShapes((shape) => shape.isHovered());
    for (let i = 0; i < hoveredEdgeShapes.length; i++) {
      hoveredEdgeShapes[i].clearState();
    }

    return { changedShapeCount: hoveredNodeShapes.length + hoveredEdgeShapes.length };
  }
}

interface ISetShapeStateOptions {
  isStateOverride: boolean;
}

const setNodeShapeState = (nodeShape: INodeShape, state: NodeShapeState, options?: ISetShapeStateOptions): void => {
  if (isShapeStateChangeable(nodeShape, options)) {
    nodeShape.setState(state);
  }

  const edgeState = getEdgeShapeStateFromNodeShapeState(state);

  nodeShape.getInEdgeShapes().forEach((edgeShape) => {
    if (edgeState !== undefined && isShapeStateChangeable(edgeShape, options)) {
      edgeShape.setState(edgeState);
    }
    const nodeShape = edgeShape.getSourceNodeShape();
    if (isShapeStateChangeable(nodeShape, options)) {
      nodeShape.setState(state);
    }
  });

  nodeShape.getOutEdgeShapes().forEach((edgeShape) => {
    if (edgeState !== undefined && isShapeStateChangeable(edgeShape, options)) {
      edgeShape.setState(edgeState);
    }
    const nodeShape = edgeShape.getTargetNodeShape();
    if (isShapeStateChangeable(nodeShape, options)) {
      nodeShape.setState(state);
    }
  });
};

const setEdgeShapeState = (edgeShape: IEdgeShape, state: EdgeShapeState, options?: ISetShapeStateOptions): void => {
  if (isShapeStateChangeable(edgeShape, options)) {
    edgeShape.setState(state);
  }

  const nodeState = getNodeShapeStateFromEdgeShapeState(state);
  if (nodeState === undefined) {
    return;
  }

  const sourceNodeShape = edgeShape.getSourceNodeShape();
  if (isShapeStateChangeable(sourceNodeShape, options)) {
    sourceNodeShape.setState(nodeState);
  }

  const targetNodeShape = edgeShape.getTargetNodeShape();
  if (isShapeStateChangeable(targetNodeShape, options)) {
    targetNodeShape.setState(nodeState);
  }
};

const isShapeStateChangeable = (shape: INodeShape | IEdgeShape, options?: ISetShapeStateOptions): boolean => {
  const isOverride = options?.isStateOverride;
  return isOverride || (!isOverride && !shape.hasState());
};

const getEdgeShapeStateFromNodeShapeState = (state: NodeShapeState): EdgeShapeState | undefined => {
  if (state === NodeShapeState.SELECT) {
    return EdgeShapeState.SELECT;
  }
  if (state === NodeShapeState.HOVER) {
    return EdgeShapeState.HOVER;
  }
};

const getNodeShapeStateFromEdgeShapeState = (state: EdgeShapeState): NodeShapeState | undefined => {
  if (state === EdgeShapeState.SELECT) {
    return NodeShapeState.SELECT;
  }
  if (state === EdgeShapeState.HOVER) {
    return NodeShapeState.HOVER;
  }
};

const getEdgeStyleOffsetById = (edges: IGraphEdge[]): Record<number, IEdgeStyleOffset> => {
  const edgeStyleOffsetById: { [id: number]: IEdgeStyleOffset } = {};
  const edgeOffsetsByUniqueKey = getEdgeOffsetsByUniqueKey(edges);

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const styleOffset: IEdgeStyleOffset = {
      type: EdgeLineStyleType.STRAIGHT,
      roundness: 0,
    };

    const uniqueKey = getUniqueEdgeKey(edge);
    const edgeOffsets = edgeOffsetsByUniqueKey[uniqueKey];
    if (edgeOffsets && edgeOffsets.length) {
      // Pull the first offset
      styleOffset.roundness = edgeOffsets.shift() ?? 0;
      if (styleOffset.roundness !== 0) {
        styleOffset.type = EdgeLineStyleType.CURVED;
      }

      const isEdgeReverseDirection = edge.end < edge.start;
      if (isEdgeReverseDirection) {
        styleOffset.roundness = -1 * styleOffset.roundness;
      }
    }

    edgeStyleOffsetById[edge.id] = styleOffset;
  }

  return edgeStyleOffsetById;
};

const getUniqueEdgeKey = (edge: IGraphEdge): string => {
  const sid = edge.start;
  const tid = edge.end;
  return sid < tid ? `${sid}-${tid}` : `${tid}-${sid}`;
};

const getEdgeOffsetsByUniqueKey = (edges: IGraphEdge[]): IEdgeOffsetsByUniqueKey => {
  const edgeCountByUniqueKey: Record<string, number> = {};
  const loopbackUniqueKeys: Set<string> = new Set<string>();

  // Count the number of edges that are between the same nodes
  for (let i = 0; i < edges.length; i++) {
    // TODO: This is expensive, so maybe we should have edge_id -> unique_key or vice versa
    const uniqueKey = getUniqueEdgeKey(edges[i]);
    if (edges[i].start === edges[i].end) {
      loopbackUniqueKeys.add(uniqueKey);
    }
    edgeCountByUniqueKey[uniqueKey] = (edgeCountByUniqueKey[uniqueKey] ?? 0) + 1;
  }

  const edgeOffsetsByUniqueKey: IEdgeOffsetsByUniqueKey = {};
  const uniqueKeys = Object.keys(edgeCountByUniqueKey);

  for (let i = 0; i < uniqueKeys.length; i++) {
    const uniqueKey = uniqueKeys[i];
    const edgeCount = edgeCountByUniqueKey[uniqueKey];

    // Loopback offsets should be 1, 2, 3, ...
    if (loopbackUniqueKeys.has(uniqueKey)) {
      edgeOffsetsByUniqueKey[uniqueKey] = Array.from({ length: edgeCount }, (_, i) => i + 1);
      continue;
    }

    if (edgeCount <= 1) {
      continue;
    }

    const edgeOffsets: number[] = [];

    // 0 means straight line. There will be a straight line between two nodes
    // when there are 1 edge, 3 edges, 5 edges, ...
    if (edgeCount % 2 !== 0) {
      edgeOffsets.push(0);
    }

    for (let i = 2; i <= edgeCount; i += 2) {
      edgeOffsets.push(i / 2);
      edgeOffsets.push((i / 2) * -1);
    }

    edgeOffsetsByUniqueKey[uniqueKey] = edgeOffsets;
  }

  return edgeOffsetsByUniqueKey;
};

// TODO: Move this to some TS utils
const objectKeys = <T>(object: T) => {
  return Object.keys(object) as (keyof T)[];
};
