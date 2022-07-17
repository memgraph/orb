import { Orb } from '../src/index';
import { DEFAULT_NODE_PROPERTIES, Node, INodeBase, INodePosition, INodeProperties } from '../src/models/node';
import { DEFAULT_EDGE_PROPERTIES, Edge, IEdgeBase, EdgeType, IEdgeProperties } from '../src/models/edge';
import { GraphObjectState } from '../src/models/state';
import { IGraphStyle, IEdgeStyle, INodeStyle } from '../src/models/style';

interface ITestNode extends INodeBase {
  name: string;
}

interface ITestEdge extends IEdgeBase {
  count: number;
}

interface IExpectedNode<N extends INodeBase> {
  id: number;
  data: N;
  properties: Partial<INodeProperties>;
  inEdges: number[];
  outEdges: number[];
  state?: GraphObjectState;
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
  properties: Partial<IEdgeProperties>;
  state?: GraphObjectState;
}

const expectEqualNode = <N extends INodeBase, E extends IEdgeBase>(
  orb: Orb<N, E>,
  data: N,
  expectedNode: IExpectedNode<N>,
) => {
  const node = orb.data.getNodeById(data.id);
  if (!node) {
    throw new Error(`Node with id ${data.id} doesn't exist in orb.data`);
  }

  const actualNode: IExpectedNode<N> = {
    id: node.id,
    data: node.data,
    properties: node.properties,
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
  orb: Orb<N, E>,
  data: E,
  expectedEdge: IExpectedEdge<E>,
) => {
  const edge = orb.data.getEdgeById(data.id);
  if (!edge) {
    throw new Error(`Edge with id ${data.id} doesn't exist in orb.data`);
  }

  const actualEdge: IExpectedEdge<E> = {
    id: edge.id,
    start: edge.start,
    end: edge.end,
    startNodeId: edge.startNode?.id,
    endNodeId: edge.endNode?.id,
    data: edge.data,
    properties: edge.properties,
    type: edge.type,
    offset: edge.offset,
    state: edge.state,
  };
  expect(actualEdge).toEqual(expectedEdge);
};

describe('Orb.data', () => {
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
      properties: DEFAULT_NODE_PROPERTIES,
      inEdges: [2],
      outEdges: [0, 3],
      state: undefined,
      position: { id: 0, x: 0, y: 0 },
    },
    {
      id: 1,
      data: nodes[1],
      properties: DEFAULT_NODE_PROPERTIES,
      inEdges: [0, 4],
      outEdges: [1, 4],
      state: undefined,
      position: { id: 1, x: 0, y: 0 },
    },
    {
      id: 2,
      data: nodes[2],
      properties: DEFAULT_NODE_PROPERTIES,
      inEdges: [1, 3],
      outEdges: [2],
      state: undefined,
      position: { id: 2, x: 0, y: 0 },
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
      properties: DEFAULT_EDGE_PROPERTIES,
      state: undefined,
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
      properties: DEFAULT_EDGE_PROPERTIES,
      state: undefined,
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
      properties: DEFAULT_EDGE_PROPERTIES,
      state: undefined,
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
      properties: DEFAULT_EDGE_PROPERTIES,
      state: undefined,
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
      properties: DEFAULT_EDGE_PROPERTIES,
      state: undefined,
    },
  ];

  describe('setup', () => {
    test('should create simple graph', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });

      expect(orb.data.getNodeCount()).toEqual(nodes.length);
      expect(orb.data.getEdgeCount()).toEqual(edges.length);

      nodes.forEach((node, i) => {
        expectEqualNode(orb, node, expectedNodes[i]);
      });
      edges.forEach((edge, i) => {
        expectEqualEdge(orb, edge, expectedEdges[i]);
      });
    });
  });

  describe('join', () => {
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
        properties: DEFAULT_NODE_PROPERTIES,
        inEdges: [],
        outEdges: [6],
        state: undefined,
        position: { id: 3, x: 0, y: 0 },
      },
      {
        id: 4,
        data: newNodes[1],
        properties: DEFAULT_NODE_PROPERTIES,
        inEdges: [6],
        outEdges: [],
        state: undefined,
        position: { id: 4, x: 0, y: 0 },
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
        properties: DEFAULT_EDGE_PROPERTIES,
        state: undefined,
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
        properties: DEFAULT_EDGE_PROPERTIES,
        state: undefined,
      },
    ];

    test('should join new nodes', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.join({ nodes: newNodes });

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = [
        ...expectedNodes,
        ...newExpectedNodes.map((expectedNode) => ({ ...expectedNode, inEdges: [], outEdges: [] })),
      ];

      expect(orb.data.getNodeCount()).toEqual(currentNodes.length);
      expect(orb.data.getEdgeCount()).toEqual(edges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(orb, node, currentExpectedNodes[i]);
      });
      edges.forEach((edge, i) => {
        expectEqualEdge(orb, edge, expectedEdges[i]);
      });
    });

    test('should join new edges', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.join({ edges: newEdges });

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

      expect(orb.data.getNodeCount()).toEqual(currentNodes.length);
      expect(orb.data.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(orb, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(orb, edge, currentExpectedEdges[i]);
      });
    });

    test('should join new nodes and edges', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.join({ nodes: newNodes, edges: newEdges });

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

      expect(orb.data.getNodeCount()).toEqual(currentNodes.length);
      expect(orb.data.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(orb, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(orb, edge, currentExpectedEdges[i]);
      });
    });

    // TODO @toni: Add tests for updating `data` with the same id, and edge `start` and `end` change
    // test('should update existing nodes and edges', () => {});
  });

  describe('hide', () => {
    test('should hide nodes', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.hide({ nodeIds: [0, 2] });

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

      expect(orb.data.getNodeCount()).toEqual(currentNodes.length);
      expect(orb.data.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(orb, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(orb, edge, currentExpectedEdges[i]);
      });
    });

    test('should hide edges', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });

      const hiddenEdgeIds = [0, 1, 4];
      orb.data.hide({ edgeIds: hiddenEdgeIds });

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

      expect(orb.data.getNodeCount()).toEqual(currentNodes.length);
      expect(orb.data.getEdgeCount()).toEqual(currentEdges.length);

      currentNodes.forEach((node, i) => {
        expectEqualNode(orb, node, currentExpectedNodes[i]);
      });
      currentEdges.forEach((edge, i) => {
        expectEqualEdge(orb, edge, currentExpectedEdges[i]);
      });
    });

    test('should hide nodes and edges', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.hide({ nodeIds: [0, 2], edgeIds: [1, 2, 4] });

      const currentNodes: ITestNode[] = [nodes[1]];
      const currentExpectedNodes: IExpectedNode<ITestNode>[] = [
        {
          ...expectedNodes[1],
          inEdges: [],
          outEdges: [],
        },
      ];

      expect(orb.data.getNodeCount()).toEqual(currentNodes.length);
      expect(orb.data.getEdgeCount()).toEqual(0);

      currentNodes.forEach((node, i) => {
        expectEqualNode(orb, node, currentExpectedNodes[i]);
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
      getNodeStyle(node: Node<ITestNode, ITestEdge>): INodeStyle | undefined {
        // Simulate a special case (will be DEFAULT)
        if (node.id === 0) {
          return undefined;
        }
        return nodeStyle;
      },
      getEdgeStyle(edge: Edge<ITestNode, ITestEdge>): IEdgeStyle | undefined {
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
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.setStyle(style);

      expect(orb.data.getNodeById(0)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      expect(orb.data.getEdgeById(0)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);

      nodes.slice(1).forEach((node) => {
        expect(orb.data.getNodeById(node.id)?.properties).toEqual(nodeStyle);
      });
      edges.slice(1).forEach((edge) => {
        expect(orb.data.getEdgeById(edge.id)?.properties).toEqual(edgeStyle);
      });
    });

    test('should apply style before setup', () => {
      const orb = new Orb();
      orb.data.setStyle(style);
      orb.data.setup({ nodes, edges });
      expect(orb.data.getNodeById(0)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      expect(orb.data.getEdgeById(0)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);

      nodes.slice(1).forEach((node) => {
        expect(orb.data.getNodeById(node.id)?.properties).toEqual(nodeStyle);
      });
      edges.slice(1).forEach((edge) => {
        expect(orb.data.getEdgeById(edge.id)?.properties).toEqual(edgeStyle);
      });
    });

    test('should apply style after join', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.join({ nodes: newNodes, edges: newEdges });
      orb.data.setStyle(style);

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];

      expect(orb.data.getNodeById(0)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      expect(orb.data.getEdgeById(0)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);

      currentNodes.slice(1).forEach((node) => {
        expect(orb.data.getNodeById(node.id)?.properties).toEqual(nodeStyle);
      });
      currentEdges.slice(1).forEach((edge) => {
        expect(orb.data.getEdgeById(edge.id)?.properties).toEqual(edgeStyle);
      });
    });

    test('should apply style before join', () => {
      const orb = new Orb();
      orb.data.setup({ nodes, edges });
      orb.data.setStyle(style);
      orb.data.join({ nodes: newNodes, edges: newEdges });

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];

      expect(orb.data.getNodeById(0)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      expect(orb.data.getEdgeById(0)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);

      currentNodes.slice(1).forEach((node) => {
        expect(orb.data.getNodeById(node.id)?.properties).toEqual(nodeStyle);
      });
      currentEdges.slice(1).forEach((edge) => {
        expect(orb.data.getEdgeById(edge.id)?.properties).toEqual(edgeStyle);
      });
    });

    test('should apply default style after join', () => {
      const orb = new Orb();
      orb.data.setStyle(style);
      orb.data.setup({ nodes, edges });
      orb.data.join({ nodes: newNodes, edges: newEdges });
      orb.data.setDefaultStyle();

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];

      expect(orb.data.getNodeById(0)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      expect(orb.data.getEdgeById(0)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);

      currentNodes.slice(1).forEach((node) => {
        expect(orb.data.getNodeById(node.id)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      });
      currentEdges.slice(1).forEach((edge) => {
        expect(orb.data.getEdgeById(edge.id)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);
      });
    });

    test('should apply default style before join', () => {
      const orb = new Orb();
      orb.data.setStyle(style);
      orb.data.setup({ nodes, edges });
      orb.data.setDefaultStyle();
      orb.data.join({ nodes: newNodes, edges: newEdges });

      const currentNodes: ITestNode[] = [...nodes, ...newNodes];
      const currentEdges: ITestEdge[] = [...edges, ...newEdges];

      expect(orb.data.getNodeById(0)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      expect(orb.data.getEdgeById(0)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);

      currentNodes.slice(1).forEach((node) => {
        expect(orb.data.getNodeById(node.id)?.properties).toEqual(DEFAULT_NODE_PROPERTIES);
      });
      currentEdges.slice(1).forEach((edge) => {
        expect(orb.data.getEdgeById(edge.id)?.properties).toEqual(DEFAULT_EDGE_PROPERTIES);
      });
    });

    // TODO @toni: Add tests where style depends on in/outEdges and then hide an edge -> style should be updated
  });
});
