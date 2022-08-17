import { INodeBase } from './node';
import { IEdge, IEdgeBase } from './edge';

export const getEdgeOffsets = <N extends INodeBase, E extends IEdgeBase>(edges: IEdge<N, E>[]): number[] => {
  const edgeOffsets = new Array<number>(edges.length);
  const edgeOffsetsByUniqueKey = getEdgeOffsetsByUniqueKey(edges);

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    let offset = 0;

    const uniqueKey = getUniqueEdgeKey(edge);
    const edgeOffsetsByKey = edgeOffsetsByUniqueKey[uniqueKey];
    if (edgeOffsetsByKey && edgeOffsetsByKey.length) {
      // Pull the first offset
      offset = edgeOffsetsByKey.shift() ?? 0;

      const isEdgeReverseDirection = edge.end < edge.start;
      if (isEdgeReverseDirection) {
        offset = -1 * offset;
      }
    }

    edgeOffsets[i] = offset;
  }

  return edgeOffsets;
};

const getUniqueEdgeKey = <E extends IEdgeBase>(edge: E): string => {
  const sid = edge.start;
  const tid = edge.end;
  return sid < tid ? `${sid}-${tid}` : `${tid}-${sid}`;
};

const getEdgeOffsetsByUniqueKey = <N extends INodeBase, E extends IEdgeBase>(
  edges: IEdge<N, E>[],
): Record<string, number[]> => {
  const edgeCountByUniqueKey: Record<string, number> = {};
  const loopbackUniqueKeys: Set<string> = new Set<string>();

  // Count the number of edges that are between the same nodes
  for (let i = 0; i < edges.length; i++) {
    const uniqueKey = getUniqueEdgeKey(edges[i]);
    if (edges[i].start === edges[i].end) {
      loopbackUniqueKeys.add(uniqueKey);
    }
    edgeCountByUniqueKey[uniqueKey] = (edgeCountByUniqueKey[uniqueKey] ?? 0) + 1;
  }

  const edgeOffsetsByUniqueKey: Record<string, number[]> = {};
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
