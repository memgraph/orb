export interface IGraphNodeBase {
  id: number;
  labels?: string[];
  properties?: Record<string, any>;
}

export interface IGraphEdgeBase {
  id: number;
  start: number;
  end: number;
  label?: string;
  properties?: Record<string, any>;
}

const LATITUDE_PROPERTY_NAME = 'lat';
const LONGITUDE_PROPERTY_NAME = 'lng';

export interface IGeoCoordinate {
  lat: number;
  lng: number;
}

export type IGraphNode = IGraphNodeBase;
export type IGraphEdge = IGraphEdgeBase;

export interface IGraph {
  readonly nodes: IGraphNode[];
  readonly edges: IGraphEdge[];
  readonly nodeLabels: Set<string>;
  readonly edgeTypes: Set<string>;

  hasNodes(): boolean;
  hasGeoNodes(): boolean;

  getNodeCount(): number;
  getEdgeCount(): number;

  getNodeById(id: number): IGraphNode | undefined;
  getEdgeById(id: number): IGraphEdge | undefined;

  getAdjacentNodesByNode(node: IGraphNode): IGraphNode[];
  getOutEdgesByNode(node: IGraphNode): IGraphEdge[];
  getInEdgesByNode(node: IGraphNode): IGraphEdge[];

  getStartNodeByEdge(edge: IGraphEdge): IGraphNode | undefined;
  getEndNodeByEdge(edge: IGraphEdge): IGraphNode | undefined;

  mergeGraph(graph: IGraph): IGraph;
  removeGraph(graph: IGraph): IGraph;
}

export class Graph implements IGraph {
  readonly nodes: IGraphNode[];
  readonly edges: IGraphEdge[];
  readonly nodeLabels: Set<string>;
  readonly edgeTypes: Set<string>;

  protected readonly nodeById: { [id: number]: IGraphNode } = {};
  protected readonly edgeById: { [id: number]: IGraphEdge } = {};
  protected readonly outEdgesByNodeId: { [id: number]: IGraphEdge[] } = {};
  protected readonly inEdgesByNodeId: { [id: number]: IGraphEdge[] } = {};

  constructor(nodes: IGraphNode[], edges: IGraphEdge[]) {
    this.nodes = nodes;
    this.edges = edges;

    this.nodeLabels = getNodeLabels(nodes);
    this.edgeTypes = getEdgeTypes(edges);

    this.nodes.forEach((node) => {
      this.nodeById[node.id] = node;
      this.outEdgesByNodeId[node.id] = [];
      this.inEdgesByNodeId[node.id] = [];
    });
    this.edges.forEach((edge) => {
      this.edgeById[edge.id] = edge;

      if (this.outEdgesByNodeId[edge.start]) {
        this.outEdgesByNodeId[edge.start].push(edge);
      }

      if (this.inEdgesByNodeId[edge.end]) {
        this.inEdgesByNodeId[edge.end].push(edge);
      }
    });
  }

  hasNodes(): boolean {
    return this.getNodeCount() > 0;
  }

  hasGeoNodes(): boolean {
    return this.nodes.some((node) => !!getNodeGeoProperties(node));
  }

  getNodeCount(): number {
    return this.nodes.length;
  }

  getEdgeCount(): number {
    return this.edges.length;
  }

  getNodeById(id: number): IGraphNode | undefined {
    return this.nodeById[id];
  }

  getEdgeById(id: number): IGraphEdge | undefined {
    return this.edgeById[id];
  }

  getAdjacentNodesByNode(node: IGraphNode): IGraphNode[] {
    const adjacentNodeById: { [id: number]: IGraphNode } = {};

    this.getOutEdgesByNode(node).forEach((edge) => {
      const adjacentNode = this.getEndNodeByEdge(edge);
      if (adjacentNode) {
        adjacentNodeById[adjacentNode.id] = adjacentNode;
      }
    });

    this.getInEdgesByNode(node).forEach((edge) => {
      const adjacentNode = this.getStartNodeByEdge(edge);
      if (adjacentNode) {
        adjacentNodeById[adjacentNode.id] = adjacentNode;
      }
    });

    return Object.values(adjacentNodeById);
  }

  getOutEdgesByNode(node: IGraphNode): IGraphEdge[] {
    return this.outEdgesByNodeId[node.id] ?? [];
  }

  getInEdgesByNode(node: IGraphNode): IGraphEdge[] {
    return this.inEdgesByNodeId[node.id] ?? [];
  }

  getStartNodeByEdge(edge: IGraphEdge): IGraphNode | undefined {
    return this.getNodeById(edge.start);
  }

  getEndNodeByEdge(edge: IGraphEdge): IGraphNode | undefined {
    return this.getNodeById(edge.end);
  }

  mergeGraph(graph: IGraph): IGraph {
    const nodes = mergeGraphNodes(this, graph);
    const edges = mergeGraphEdges(this, graph);
    return new Graph(nodes, edges);
  }

  removeGraph(graph: IGraph): IGraph {
    const newNodes = this.nodes.filter((node) => {
      return !graph.getNodeById(node.id);
    });
    const newEdges = this.edges.filter((edge) => {
      const isStartNodeKept = !graph.getStartNodeByEdge(edge);
      const isEndNodeKept = !graph.getEndNodeByEdge(edge);
      const isEdgeKept = !graph.getEdgeById(edge.id);
      return isEdgeKept && isStartNodeKept && isEndNodeKept;
    });

    return new Graph(newNodes, newEdges);
  }
}

export const getNodeGeoProperties = (node: IGraphNode): IGeoCoordinate | undefined => {
  const lat = node.properties?.[LATITUDE_PROPERTY_NAME];
  const lng = node.properties?.[LONGITUDE_PROPERTY_NAME];
  if (lat === undefined || lng === undefined) {
    return;
  }
  return { lat, lng };
};

const getNodeLabels = (nodes: IGraphNode[]): Set<string> => {
  const nodeLabels: Set<string> = new Set<string>();

  for (const node of nodes) {
    node.labels?.forEach((label) => nodeLabels.add(label));
  }
  return nodeLabels;
};

const getEdgeTypes = (edges: IGraphEdge[]): Set<string> => {
  const edgeTypes: Set<string> = new Set<string>();

  for (const edge of edges) {
    if (edge.label) {
      edgeTypes.add(edge.label);
    }
  }
  return edgeTypes;
};

const mergeGraphNodes = (graph1: IGraph, graph2: IGraph): IGraphNode[] => {
  const smallGraph = graph1.getNodeCount() < graph2.getNodeCount() ? graph1 : graph2;
  const largeGraph = graph1.getNodeCount() < graph2.getNodeCount() ? graph2 : graph1;

  const nodes = [...largeGraph.nodes];
  for (const node of smallGraph.nodes) {
    if (largeGraph.getNodeById(node.id)) {
      continue;
    }
    nodes.push(node);
  }

  return nodes;
};

const mergeGraphEdges = (graph1: IGraph, graph2: IGraph): IGraphEdge[] => {
  const smallGraph = graph1.getEdgeCount() < graph2.getEdgeCount() ? graph1 : graph2;
  const largeGraph = graph1.getEdgeCount() < graph2.getEdgeCount() ? graph2 : graph1;

  const edges = [...largeGraph.edges];
  for (const edge of smallGraph.edges) {
    if (largeGraph.getEdgeById(edge.id)) {
      continue;
    }
    edges.push(edge);
  }

  return edges;
};
