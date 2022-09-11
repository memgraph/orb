import { INode, INodeBase, INodePosition, INodeStyle } from '../../src/models/node';
import { IEdge, IEdgeBase, EdgeType, IEdgeStyle } from '../../src/models/edge';
import { IGraphStyle, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE, getDefaultGraphStyle } from '../../src/models/style';
import { Graph } from '../../src/models/graph';
import { GraphObjectState } from '../../src/models/state';

interface ITestNode extends INodeBase {
  name: string;
}

interface ITestEdge extends IEdgeBase {
  count: number;
}

interface IExpectedNode<N extends INodeBase> {
  id: number;
  data: N;
  style: INodeStyle;
  inEdges: number[];
  outEdges: number[];
  state: number;
  position: INodePosition;
}

interface IExpectedEdge<E extends IEdgeBase> {
  id: number;
  start: number;
  end: number;
  data: E;
  startNodeId?: number;
  endNodeId?: number;
  type: EdgeType;
  offset: number;
  style: IEdgeStyle;
  state: number;
}

const expectEqualNode = <N extends INodeBase, E extends IEdgeBase>(
  graph: Graph<N, E>,
  data: N,
  expectedNode: IExpectedNode<N>,
) => {
  const node = graph.getNodeById(data.id);
  if (!node) {
    throw new Error(`Node with id ${data.id} doesn't exist in graph`);
  }

  const actualNode: IExpectedNode<N> = {
    id: node.id,
    data: node.data,
    style: node.style,
    inEdges: node
      .getInEdges()
      .map((edge) => edge.id)
      .sort(),
    outEdges: node
      .getOutEdges()
      .map((edge) => edge.id)
      .sort(),
    state: node.state,
    position: node.position,
  };
  expect(actualNode).toEqual(expectedNode);
};

const expectEqualEdge = <N extends INodeBase, E extends IEdgeBase>(
  graph: Graph<N, E>,
  data: E,
  expectedEdge: IExpectedEdge<E>,
) => {
  const edge = graph.getEdgeById(data.id);
  if (!edge) {
    throw new Error(`Edge with id ${data.id} doesn't exist in graph`);
  }

  const actualEdge: IExpectedEdge<E> = {
    id: edge.id,
    start: edge.start,
    end: edge.end,
    startNodeId: edge.startNode?.id,
    endNodeId: edge.endNode?.id,
    data: edge.data,
    style: edge.style,
    type: edge.type,
    offset: edge.offset,
    state: edge.state,
  };
  expect(actualEdge).toEqual(expectedEdge);
};

describe('Graph', () => {
  const nodes: ITestNode[] = [
    { id: 0, name: 'John' },
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Charlie' },
  ];

  const edges: ITestEdge[] = [
    { id: 0, start: 0, end: 1, count: 1 },
    { id: 1, start: 1, end: 2, count: 0 },
    { id: 2, start: 2, end: 0, count: 7 },
    { id: 3, start: 0, end: 2, count: 7 },
    { id: 4, start: 1, end: 1, count: 5 },
  ];

  const expectedNodes: IExpectedNode<ITestNode>[] = [
    {
      id: 0,
      data: nodes[0],
      style: {},
      inEdges: [2],
      outEdges: [0, 3],
      state: GraphObjectState.NONE,
      position: { id: 0 },
    },
    {
      id: 1,
      data: nodes[1],
      style: {},
      inEdges: [0, 4],
      outEdges: [1, 4],
      state: GraphObjectState.NONE,
      position: { id: 1 },
    },
    {
      id: 2,
      data: nodes[2],
      style: {},
      inEdges: [1, 3],
      outEdges: [2],
      state: GraphObjectState.NONE,
      position: { id: 2 },
    },
  ];

  const expectedEdges: IExpectedEdge<ITestEdge>[] = [
    {
      id: 0,
      start: 0,
      end: 1,
      startNodeId: 0,
      endNodeId: 1,
      data: edges[0],
      type: EdgeType.STRAIGHT,
      offset: 0,
      style: {},
      state: GraphObjectState.NONE,
    },
    {
      id: 1,
      start: 1,
      end: 2,
      startNodeId: 1,
      endNodeId: 2,
      data: edges[1],
      type: EdgeType.STRAIGHT,
      offset: 0,
      style: {},
      state: GraphObjectState.NONE,
    },
    {
      id: 2,
      start: 2,
      end: 0,
      startNodeId: 2,
      endNodeId: 0,
      data: edges[2],
      type: EdgeType.CURVED,
      offset: -1,
      style: {},
      state: GraphObjectState.NONE,
    },
    {
      id: 3,
      start: 0,
      end: 2,
      startNodeId: 0,
      endNodeId: 2,
      data: edges[3],
      type: EdgeType.CURVED,
      offset: -1,
      style: {},
      state: GraphObjectState.NONE,
    },
    {
      id: 4,
      start: 1,
      end: 1,
      startNodeId: 1,
      endNodeId: 1,
      data: edges[4],
      type: EdgeType.LOOPBACK,
      offset: 1,
      style: {},
      state: GraphObjectState.NONE,
    },
  ];

  describe('constructor', () => {
    test('should create simple graph', () => {
      const graph = new Graph({ nodes, edges });

      expect(graph.getNodeCount()).toEqual(nodes.length);
      expect(graph.getEdgeCount()).toEqual(edges.length);

      nodes.forEach((node, i) => {
        expectEqualNode(graph, node, expectedNodes[i]);
      });
      edges.forEach((edge, i) => {
        expectEqualEdge(graph, edge, expectedEdges[i]);
      });
    });
  });

  describe('merge', () => {
    const newNodes: ITestNode[] = [
      { id: 3, name: 'Mia' },
      { id: 4, name: 'Lana' },
    ];

    const newEdges: ITestEdge[] = [
      { id: 5, start: 0, end: 0, count: 1 },
      { id: 6, start: 3, end: 4, count: 6 },
    ];

    const newExpectedNodes: IExpectedNode<ITestNode>[] = [
      {
        id: 3,
        data: newNodes[0],
        style: {},
        inEdges: [],
        outEdges: [6],
        state: GraphObjectState.NONE,
        position: { id: 3 },
      },
      {
        id: 4,
        data: newNodes[1],
        style: {},
        inEdges: [6],
        outEdges: [],
        state: GraphObjectState.NONE,
        position: { id: 4 },
      },
    ];

    const newExpectedEdges: IExpectedEdge<ITestEdge>[] = [
      {
        id: 5,
        start: 0,
        end: 0,
        startNodeId: 0,
        endNodeId: 0,
        data: newEdges[0],
        type: EdgeType.LOOPBACK,
        offset: 1,
        style: {},
        state: GraphObjectState.NONE,
      },
      {
        id: 6,
        start: 3,
        end: 4,
        startNodeId: 3,
        endNodeId: 4,
        data: newEdges[1],
        type: EdgeType.STRAIGHT,
        offset: 0,
        style: {},
        state: GraphObjectState.NONE,
      },
    ];

    test('should merge new nodes', () => {
      const graph = new Graph({ nodes, edges });
      graph.merge({ nodes: newNodes });

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = [
        ...expectedNodes,
        ...newExpectedNodes.map((expectedNode) => ({ ...expectedNode, inEdges: [], outEdges: [] })),
      ];

      expect(graph.getNodeCount()).toEqual(currentNodes.length);
      expect(graph.getEdgeCount()).toEqual(edges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(graph, node, currentExpectedNodes[i]);
      });
      edges.forEach((edge, i) => {
        expectEqualEdge(graph, edge, expectedEdges[i]);
      });
    });

    test('should merge new edges', () => {
      const graph = new Graph({ nodes, edges });
      graph.merge({ edges: newEdges });

      const currentNodes: ITestNode[] = [...nodes];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = [
        {
          ...expectedNodes[0],
          inEdges: [2, 5],
          outEdges: [0, 3, 5],
        },
        ...expectedNodes.slice(1),
      ];
      const currentEdges: ITestEdge[] = [...edges, newEdges[0]];
      // Second edge won't be used because nodes 3 and 4 don't exist
      const currentExpectedEdges: IExpectedEdge<ITestEdge>[] = [...expectedEdges, newExpectedEdges[0]];

      expect(graph.getNodeCount()).toEqual(currentNodes.length);
      expect(graph.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(graph, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(graph, edge, currentExpectedEdges[i]);
      });
    });

    test('should merge new nodes and edges', () => {
      const graph = new Graph({ nodes, edges });
      graph.merge({ nodes: newNodes, edges: newEdges });

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = [
        {
          ...expectedNodes[0],
          inEdges: [2, 5],
          outEdges: [0, 3, 5],
        },
        ...expectedNodes.slice(1),
        ...newExpectedNodes,
      ];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];
      const currentExpectedEdges: IExpectedEdge<ITestEdge>[] = [...expectedEdges, ...newExpectedEdges];

      expect(graph.getNodeCount()).toEqual(currentNodes.length);
      expect(graph.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(graph, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(graph, edge, currentExpectedEdges[i]);
      });
    });

    // TODO @toni: Add tests for updating `data` with the same id, and edge `start` and `end` change
    // test('should update existing nodes and edges', () => {});
  });

  describe('remove', () => {
    test('should remove nodes', () => {
      const graph = new Graph({ nodes, edges });
      graph.remove({ nodeIds: [0, 2] });

      const currentNodes: ITestNode[] = [nodes[1]];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = [
        {
          ...expectedNodes[1],
          inEdges: [4],
          outEdges: [4],
        },
      ];
      const currentEdges: ITestEdge[] = [edges[4]];
      const currentExpectedEdges: IExpectedEdge<ITestEdge>[] = [expectedEdges[4]];

      expect(graph.getNodeCount()).toEqual(currentNodes.length);
      expect(graph.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(graph, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(graph, edge, currentExpectedEdges[i]);
      });
    });

    test('should remove edges', () => {
      const graph = new Graph({ nodes, edges });

      const hiddenEdgeIds = [0, 1, 4];
      graph.remove({ edgeIds: hiddenEdgeIds });

      const currentNodes: ITestNode[] = [...nodes];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = expectedNodes.map((expectedNode) => {
        return {
          ...expectedNode,
          inEdges: expectedNode.inEdges.filter((edgeId) => !hiddenEdgeIds.includes(edgeId)),
          outEdges: expectedNode.outEdges.filter((edgeId) => !hiddenEdgeIds.includes(edgeId)),
        };
      });
      const currentEdges: ITestEdge[] = [edges[2], edges[3]];
      const currentExpectedEdges: IExpectedEdge<ITestEdge>[] = [expectedEdges[2], expectedEdges[3]];

      expect(graph.getNodeCount()).toEqual(currentNodes.length);
      expect(graph.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(graph, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(graph, edge, currentExpectedEdges[i]);
      });
    });

    test('should hide nodes and edges', () => {
      const graph = new Graph({ nodes, edges });
      graph.remove({ nodeIds: [0, 2], edgeIds: [1, 2, 4] });

      const currentNodes: ITestNode[] = [nodes[1]];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = [
        {
          ...expectedNodes[1],
          inEdges: [],
          outEdges: [],
        },
      ];

      expect(graph.getNodeCount()).toEqual(currentNodes.length);
      expect(graph.getEdgeCount()).toEqual(0);

      currentNodes.forEach((node, i) => {
        expectEqualNode(graph, node, currentExpectedNodes[i]);
      });
    });
  });

  describe('style', () => {
    const nodeStyle: INodeStyle = {
      color: 'red',
      size: 10,
    };

    const edgeStyle: IEdgeStyle = {
      color: 'blue',
      width: 1,
    };

    const style: IGraphStyle<ITestNode, ITestEdge> = {
      getNodeStyle(node: INode<ITestNode, ITestEdge>): INodeStyle | undefined {
        // Simulate a special case (will be DEFAULT)
        if (node.id === 0) {
          return undefined;
        }
        return nodeStyle;
      },
      getEdgeStyle(edge: IEdge<ITestNode, ITestEdge>): IEdgeStyle | undefined {
        // Simulate a special case (will be DEFAULT)
        if (edge.id === 0) {
          return undefined;
        }
        return edgeStyle;
      },
    };

    const newNodes: ITestNode[] = [
      { id: 3, name: 'Mia' },
      { id: 4, name: 'Lana' },
    ];

    const newEdges: ITestEdge[] = [
      { id: 5, start: 0, end: 0, count: 1 },
      { id: 6, start: 3, end: 4, count: 6 },
    ];

    test('should apply style after setup', () => {
      const graph = new Graph({ nodes, edges });
      graph.setDefaultStyle(style);

      expect(graph.getNodeById(0)?.style).toEqual({});
      expect(graph.getEdgeById(0)?.style).toEqual({});

      nodes.slice(1).forEach((node) => {
        expect(graph.getNodeById(node.id)?.style).toEqual(nodeStyle);
      });
      edges.slice(1).forEach((edge) => {
        expect(graph.getEdgeById(edge.id)?.style).toEqual(edgeStyle);
      });
    });

    test('should apply style before setup', () => {
      const graph = new Graph();
      graph.setDefaultStyle(style);
      graph.setup({ nodes, edges });

      expect(graph.getNodeById(0)?.style).toEqual({});
      expect(graph.getEdgeById(0)?.style).toEqual({});

      nodes.slice(1).forEach((node) => {
        expect(graph.getNodeById(node.id)?.style).toEqual(nodeStyle);
      });
      edges.slice(1).forEach((edge) => {
        expect(graph.getEdgeById(edge.id)?.style).toEqual(edgeStyle);
      });
    });

    test('should apply style after merge', () => {
      const graph = new Graph({ nodes, edges });
      graph.merge({ nodes: newNodes, edges: newEdges });
      graph.setDefaultStyle(style);

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];

      expect(graph.getNodeById(0)?.style).toEqual({});
      expect(graph.getEdgeById(0)?.style).toEqual({});

      currentNodes.slice(1).forEach((node) => {
        expect(graph.getNodeById(node.id)?.style).toEqual(nodeStyle);
      });
      currentEdges.slice(1).forEach((edge) => {
        expect(graph.getEdgeById(edge.id)?.style).toEqual(edgeStyle);
      });
    });

    test('should apply style before merge', () => {
      const graph = new Graph({ nodes, edges });
      graph.setDefaultStyle(style);
      graph.merge({ nodes: newNodes, edges: newEdges });

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];

      expect(graph.getNodeById(0)?.style).toEqual({});
      expect(graph.getEdgeById(0)?.style).toEqual({});

      currentNodes.slice(1).forEach((node) => {
        expect(graph.getNodeById(node.id)?.style).toEqual(nodeStyle);
      });
      currentEdges.slice(1).forEach((edge) => {
        expect(graph.getEdgeById(edge.id)?.style).toEqual(edgeStyle);
      });
    });

    test('should not apply second default style', () => {
      const graph = new Graph();
      graph.setDefaultStyle(style);
      graph.setup({ nodes, edges });
      graph.merge({ nodes: newNodes, edges: newEdges });
      graph.setDefaultStyle(getDefaultGraphStyle());

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];

      expect(graph.getNodeById(0)?.style).toEqual({ ...DEFAULT_NODE_STYLE, label: nodes[0].name });
      expect(graph.getEdgeById(0)?.style).toEqual(DEFAULT_EDGE_STYLE);

      currentNodes.slice(1).forEach((node) => {
        expect(graph.getNodeById(node.id)?.style).toEqual(nodeStyle);
      });
      currentEdges.slice(1).forEach((edge) => {
        expect(graph.getEdgeById(edge.id)?.style).toEqual(edgeStyle);
      });
    });

    test('should apply second default style for new nodes', () => {
      const graph = new Graph();
      graph.setDefaultStyle(style);
      graph.setup({ nodes, edges });
      graph.setDefaultStyle(getDefaultGraphStyle());
      graph.merge({ nodes: newNodes, edges: newEdges });

      expect(graph.getNodeById(0)?.style).toEqual({ ...DEFAULT_NODE_STYLE, label: nodes[0].name });
      expect(graph.getEdgeById(0)?.style).toEqual(DEFAULT_EDGE_STYLE);

      nodes.slice(1).forEach((node) => {
        expect(graph.getNodeById(node.id)?.style).toEqual(nodeStyle);
      });
      newNodes.forEach((node) => {
        expect(graph.getNodeById(node.id)?.style).toEqual({ ...DEFAULT_NODE_STYLE, label: node.name });
      });

      edges.slice(1).forEach((edge) => {
        expect(graph.getEdgeById(edge.id)?.style).toEqual(edgeStyle);
      });
      newEdges.forEach((edge) => {
        expect(graph.getEdgeById(edge.id)?.style).toEqual(DEFAULT_EDGE_STYLE);
      });
    });

    // TODO @toni: Add tests where style depends on in/outEdges and then hide an edge -> style should be updated
  });
});
