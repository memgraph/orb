import { Graph } from '../../src/models/graph';
import { GraphInteraction } from '../../src/models/interaction';
import { RectangleArea } from '../../src/common/area/rectangle';
import { getDefaultGraphStyle } from '../../src/models/style';
import { INodeBase } from '../../src/models/node';
import { IEdgeBase } from '../../src/models/edge';

interface ITestNode extends INodeBase {
  name: string;
}

type ITestEdge = IEdgeBase;

const buildGraph = () => {
  const nodes: ITestNode[] = [
    { id: 0, name: 'origin' },
    { id: 1, name: 'near' },
    { id: 2, name: 'far' },
    { id: 3, name: 'unpositioned' },
  ];
  const edges: ITestEdge[] = [
    { id: 0, start: 0, end: 1 },
    { id: 1, start: 1, end: 2 },
  ];
  const graph = new Graph<ITestNode, ITestEdge>({ nodes, edges });
  graph.setDefaultStyle(getDefaultGraphStyle());

  graph.getNodeById(0)!.setPosition({ x: 0, y: 0 });
  graph.getNodeById(1)!.setPosition({ x: 100, y: 100 });
  graph.getNodeById(2)!.setPosition({ x: 500, y: 500 });
  // Node 3 is intentionally left without a position.

  return graph;
};

describe('Graph.getNodesInArea', () => {
  test('returns nodes whose center is inside the area', () => {
    const graph = buildGraph();
    const area = RectangleArea.fromPoints({ x: -10, y: -10 }, { x: 150, y: 150 });

    const ids = graph
      .getNodesInArea(area)
      .map((node) => node.getId())
      .sort();

    expect(ids).toEqual([0, 1]);
  });

  test('is independent of corner order', () => {
    const graph = buildGraph();
    const area = RectangleArea.fromPoints({ x: 150, y: 150 }, { x: -10, y: -10 });

    const ids = graph
      .getNodesInArea(area)
      .map((node) => node.getId())
      .sort();

    expect(ids).toEqual([0, 1]);
  });

  test('ignores nodes without a resolved position, even when the area covers the origin', () => {
    const graph = buildGraph();
    const area = RectangleArea.fromPoints({ x: -50, y: -50 }, { x: 50, y: 50 });

    const ids = graph.getNodesInArea(area).map((node) => node.getId());

    expect(ids).toContain(0);
    expect(ids).not.toContain(3);
  });

  test('returns an empty list when no node falls inside', () => {
    const graph = buildGraph();
    const area = RectangleArea.fromPoints({ x: 1000, y: 1000 }, { x: 1100, y: 1100 });

    expect(graph.getNodesInArea(area)).toHaveLength(0);
  });
});

describe('GraphInteraction batch selection', () => {
  test('selectNodesByIds selects only the listed nodes (non-cascading)', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);

    const count = interaction.selectNodesByIds([0, 1]);

    expect(count).toBe(2);
    expect(graph.getNodeById(0)!.isSelected()).toBe(true);
    expect(graph.getNodeById(1)!.isSelected()).toBe(true);
    expect(graph.getNodeById(2)!.isSelected()).toBe(false);
    // Non-cascading: the edge between the two selected nodes is not pulled in.
    expect(graph.getEdgeById(0)!.isSelected()).toBe(false);
  });

  test('selectNodesByIds skips unknown ids and counts only matches', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);

    const count = interaction.selectNodesByIds([0, 999]);

    expect(count).toBe(1);
    expect(graph.getNodeById(0)!.isSelected()).toBe(true);
  });

  test('unselectNodesByIds clears only the listed nodes', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);
    interaction.selectNodesByIds([0, 1]);

    const removed = interaction.unselectNodesByIds([0]);

    expect(removed).toBe(1);
    expect(graph.getNodeById(0)!.isSelected()).toBe(false);
    expect(graph.getNodeById(1)!.isSelected()).toBe(true);
  });

  test('selectEdgesByIds selects only the listed edges (non-cascading)', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);

    const count = interaction.selectEdgesByIds([0]);

    expect(count).toBe(1);
    expect(graph.getEdgeById(0)!.isSelected()).toBe(true);
    expect(graph.getEdgeById(1)!.isSelected()).toBe(false);
    // Non-cascading: the edge's endpoints are not pulled in.
    expect(graph.getNodeById(0)!.isSelected()).toBe(false);
    expect(graph.getNodeById(1)!.isSelected()).toBe(false);
  });

  test('selectEdgesByIds skips unknown ids and counts only matches', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);

    const count = interaction.selectEdgesByIds([0, 999]);

    expect(count).toBe(1);
    expect(graph.getEdgeById(0)!.isSelected()).toBe(true);
  });

  test('unselectEdgesByIds clears only the listed edges', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);
    interaction.selectEdgesByIds([0, 1]);

    const removed = interaction.unselectEdgesByIds([0]);

    expect(removed).toBe(1);
    expect(graph.getEdgeById(0)!.isSelected()).toBe(false);
    expect(graph.getEdgeById(1)!.isSelected()).toBe(true);
  });
});

describe('Graph.getStyleVersion', () => {
  test('bumps when a node/edge state changes silently, so cached-style renderers can detect it', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);

    const v0 = graph.getStyleVersion();
    interaction.selectNodesByIds([0, 1]);
    const v1 = graph.getStyleVersion();
    interaction.unselectAll();
    const v2 = graph.getStyleVersion();
    interaction.selectEdgesByIds([0]);
    const v3 = graph.getStyleVersion();

    expect(v1).toBeGreaterThan(v0);
    expect(v2).toBeGreaterThan(v1);
    expect(v3).toBeGreaterThan(v2);
  });

  test('does not bump when nothing actually changes state', () => {
    const graph = buildGraph();
    const interaction = new GraphInteraction(graph);
    interaction.selectNodesByIds([0]);

    const before = graph.getStyleVersion();
    interaction.selectNodesByIds([0]); // already selected -> no state change
    expect(graph.getStyleVersion()).toBe(before);
  });
});
