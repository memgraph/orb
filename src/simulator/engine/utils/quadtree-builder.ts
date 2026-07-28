export interface IQuadTreeResult {
  treeData: Float32Array;
  treeChildren: Float32Array;
  treeGeometry: Float32Array;
  nodeCount: number;
  texWidth: number;
}

interface ITreeNode {
  cx: number;
  cy: number;
  charge: number;
  size: number;
  bodyIndex: number;
  children: (number | null)[];
}

export function buildQuadTree(positions: { x: number; y: number }[], strength: number): IQuadTreeResult {
  const N = positions.length;
  if (N === 0) {
    return {
      treeData: new Float32Array(0),
      treeChildren: new Float32Array(0),
      treeGeometry: new Float32Array(0),
      nodeCount: 0,
      texWidth: 1,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < N; i++) {
    const x = positions[i].x;
    const y = positions[i].y;
    if (x < minX) {
      minX = x;
    }
    if (y < minY) {
      minY = y;
    }
    if (x > maxX) {
      maxX = x;
    }
    if (y > maxY) {
      maxY = y;
    }
  }

  let size = Math.max(maxX - minX, maxY - minY);
  if (size < 1e-6) {
    size = 1;
  }
  size *= 1.01;
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const halfSize = size * 0.5;
  const rootX0 = cx - halfSize;
  const rootY0 = cy - halfSize;

  const nodes: ITreeNode[] = [];

  function allocNode(sz: number): number {
    const idx = nodes.length;
    nodes.push({
      cx: 0,
      cy: 0,
      charge: 0,
      size: sz,
      bodyIndex: -1,
      children: [null, null, null, null],
    });
    return idx;
  }

  const rootIdx = allocNode(size);

  const nodeX0: number[] = [rootX0];
  const nodeY0: number[] = [rootY0];

  function getQuadrant(px: number, py: number, x0: number, y0: number, sz: number): number {
    const midX = x0 + sz * 0.5;
    const midY = y0 + sz * 0.5;
    const right = px >= midX ? 1 : 0;
    const bottom = py >= midY ? 1 : 0;
    return bottom * 2 + right;
  }

  function childBounds(q: number, x0: number, y0: number, sz: number): { cx0: number; cy0: number; csz: number } {
    const half = sz * 0.5;
    const cx0 = q & 1 ? x0 + half : x0;
    const cy0 = q & 2 ? y0 + half : y0;
    return { cx0, cy0, csz: half };
  }

  function insertBody(bodyIdx: number, bx: number, by: number): void {
    let nodeIdx = rootIdx;
    let x0 = rootX0;
    let y0 = rootY0;
    let sz = size;

    for (let depth = 0; depth < 50; depth++) {
      const node = nodes[nodeIdx];

      if (
        node.bodyIndex === -1 &&
        node.children[0] === null &&
        node.children[1] === null &&
        node.children[2] === null &&
        node.children[3] === null
      ) {
        node.bodyIndex = bodyIdx;
        node.cx = bx;
        node.cy = by;
        node.charge = strength;
        return;
      }

      if (node.bodyIndex >= 0) {
        const existingBody = node.bodyIndex;
        const ex = node.cx;
        const ey = node.cy;
        node.bodyIndex = -1;

        const eq = getQuadrant(ex, ey, x0, y0, sz);
        const { cx0: ecx0, cy0: ecy0, csz: ecsz } = childBounds(eq, x0, y0, sz);
        const childIdx = allocNode(ecsz);
        nodeX0[childIdx] = ecx0;
        nodeY0[childIdx] = ecy0;
        node.children[eq] = childIdx;
        nodes[childIdx].bodyIndex = existingBody;
        nodes[childIdx].cx = ex;
        nodes[childIdx].cy = ey;
        nodes[childIdx].charge = strength;
      }

      const q = getQuadrant(bx, by, x0, y0, sz);
      if (node.children[q] === null) {
        const { cx0, cy0, csz } = childBounds(q, x0, y0, sz);
        const childIdx = allocNode(csz);
        nodeX0[childIdx] = cx0;
        nodeY0[childIdx] = cy0;
        node.children[q] = childIdx;
        nodes[childIdx].bodyIndex = bodyIdx;
        nodes[childIdx].cx = bx;
        nodes[childIdx].cy = by;
        nodes[childIdx].charge = strength;
        return;
      }

      const { cx0, cy0, csz } = childBounds(q, x0, y0, sz);
      nodeIdx = node.children[q]!;
      x0 = cx0;
      y0 = cy0;
      sz = csz;
    }
  }

  for (let i = 0; i < N; i++) {
    insertBody(i, positions[i].x, positions[i].y);
  }

  function computeAggregates(idx: number): void {
    const node = nodes[idx];
    if (node.bodyIndex >= 0) {
      return;
    }

    let totalCharge = 0;
    let wcx = 0;
    let wcy = 0;
    let totalWeight = 0;

    for (let q = 0; q < 4; q++) {
      const childIdx = node.children[q];
      if (childIdx === null) {
        continue;
      }
      computeAggregates(childIdx);
      const child = nodes[childIdx];
      const w = Math.abs(child.charge);
      totalCharge += child.charge;
      wcx += child.cx * w;
      wcy += child.cy * w;
      totalWeight += w;
    }

    if (totalWeight > 0) {
      node.cx = wcx / totalWeight;
      node.cy = wcy / totalWeight;
    }
    node.charge = totalCharge;
  }

  computeAggregates(rootIdx);

  const treeNodeCount = nodes.length;
  const texWidth = Math.ceil(Math.sqrt(treeNodeCount));
  const texSize = texWidth * texWidth;

  const treeData = new Float32Array(texSize * 4);
  const treeChildren = new Float32Array(texSize * 4);
  const treeGeometry = new Float32Array(texSize * 4);

  for (let i = 0; i < treeNodeCount; i++) {
    const node = nodes[i];
    const off = i * 4;

    treeData[off] = node.cx;
    treeData[off + 1] = node.cy;
    treeData[off + 2] = node.charge;

    if (node.bodyIndex >= 0) {
      treeData[off + 3] = -(node.bodyIndex + 1);
    } else {
      treeData[off + 3] = node.size;
    }

    treeChildren[off] = node.children[0] !== null ? node.children[0] : -1;
    treeChildren[off + 1] = node.children[1] !== null ? node.children[1] : -1;
    treeChildren[off + 2] = node.children[2] !== null ? node.children[2] : -1;
    treeChildren[off + 3] = node.children[3] !== null ? node.children[3] : -1;

    treeGeometry[off] = nodeX0[i] ?? 0;
    treeGeometry[off + 1] = nodeY0[i] ?? 0;
    treeGeometry[off + 2] = node.size;
    treeGeometry[off + 3] = 0;
  }

  for (let i = treeNodeCount; i < texSize; i++) {
    const off = i * 4;
    treeData[off + 3] = 0;
    treeChildren[off] = -1;
    treeChildren[off + 1] = -1;
    treeChildren[off + 2] = -1;
    treeChildren[off + 3] = -1;
    treeGeometry[off] = 0;
    treeGeometry[off + 1] = 0;
    treeGeometry[off + 2] = 0;
    treeGeometry[off + 3] = 0;
  }

  return { treeData, treeChildren, treeGeometry, nodeCount: treeNodeCount, texWidth };
}
