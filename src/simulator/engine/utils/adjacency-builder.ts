import { ISimulationEdge, ISimulationNode } from '../../shared';

export interface IAdjacencyResult {
  offsets: Float32Array;
  edges: Float32Array;
  offsetsTexWidth: number;
  edgesTexWidth: number;
}

export function buildAdjacency(
  nodes: ISimulationNode[],
  edges: ISimulationEdge[],
  linkDistance: number,
  linkStrength: number | undefined,
): IAdjacencyResult {
  const N = nodes.length;
  const nodeIndexById: Record<number, number> = {};
  for (let i = 0; i < N; i++) {
    nodeIndexById[nodes[i].id] = i;
  }

  const degree = new Uint32Array(N);

  const resolvedEdges: { srcIdx: number; tgtIdx: number }[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const srcId = typeof edge.source === 'object' ? (edge.source as ISimulationNode).id : (edge.source as number);
    const tgtId = typeof edge.target === 'object' ? (edge.target as ISimulationNode).id : (edge.target as number);
    const srcIdx = nodeIndexById[srcId];
    const tgtIdx = nodeIndexById[tgtId];
    if (srcIdx === undefined || tgtIdx === undefined) {
      continue;
    }
    resolvedEdges.push({ srcIdx, tgtIdx });
    degree[srcIdx]++;
    degree[tgtIdx]++;
  }

  const totalDirectedEdges = resolvedEdges.length * 2;

  const adjCounts = new Uint32Array(N);
  const adjStarts = new Uint32Array(N);

  const tempCounts = new Uint32Array(N);
  for (const { srcIdx, tgtIdx } of resolvedEdges) {
    tempCounts[srcIdx]++;
    tempCounts[tgtIdx]++;
  }

  let offset = 0;
  for (let i = 0; i < N; i++) {
    adjStarts[i] = offset;
    adjCounts[i] = tempCounts[i];
    offset += tempCounts[i];
  }

  const edgesData = new Float32Array(totalDirectedEdges * 4);
  const writePos = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    writePos[i] = adjStarts[i];
  }

  for (const { srcIdx, tgtIdx } of resolvedEdges) {
    const bias = degree[srcIdx] / (degree[srcIdx] + degree[tgtIdx]);
    const str = linkStrength !== undefined ? linkStrength : 1 / Math.min(degree[srcIdx], degree[tgtIdx]);

    {
      const off = writePos[srcIdx] * 4;
      edgesData[off] = tgtIdx;
      edgesData[off + 1] = linkDistance;
      edgesData[off + 2] = str;
      edgesData[off + 3] = 1 - bias;
      writePos[srcIdx]++;
    }

    {
      const off = writePos[tgtIdx] * 4;
      edgesData[off] = srcIdx;
      edgesData[off + 1] = linkDistance;
      edgesData[off + 2] = str;
      edgesData[off + 3] = bias;
      writePos[tgtIdx]++;
    }
  }

  const offsetsTexWidth = Math.max(1, Math.ceil(Math.sqrt(N)));
  const offsetsTexSize = offsetsTexWidth * offsetsTexWidth;
  const offsetsData = new Float32Array(offsetsTexSize * 4);
  for (let i = 0; i < N; i++) {
    offsetsData[i * 4] = adjStarts[i];
    offsetsData[i * 4 + 1] = adjCounts[i];
  }

  const edgesTexWidth = Math.max(1, Math.ceil(Math.sqrt(totalDirectedEdges)));
  const edgesTexSize = edgesTexWidth * edgesTexWidth;
  const paddedEdges = new Float32Array(edgesTexSize * 4);
  paddedEdges.set(edgesData);

  return {
    offsets: offsetsData,
    edges: paddedEdges,
    offsetsTexWidth,
    edgesTexWidth,
  };
}
