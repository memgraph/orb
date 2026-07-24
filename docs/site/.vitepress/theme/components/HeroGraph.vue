<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

// A lightweight, decorative drifting-graph animation for the home hero.
// Nodes float gently (soft repulsion + damping, never fully settling), edges
// connect nearest neighbours, and a vertical orange→yellow gradient is used as
// a color mask so nodes/edges near the top read orange and those near the
// bottom read yellow. The graph is confined to the right side of the hero (soft
// containment + a left-edge dissolve) so it never collides with the centered
// hero text. Moving the cursor pushes nodes away.

const mount = ref<HTMLElement | null>(null);
let cleanup: (() => void) | null = null;

onMounted(() => {
  // The `home-hero-before` slot renders as a sibling of `.VPHero` inside
  // `.VPHome`, so reach the hero from the shared home wrapper.
  const home = mount.value?.closest('.VPHome') as HTMLElement | null;
  const host = (home?.querySelector('.VPHero') as HTMLElement | null) ?? mount.value!;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-graph-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Tunables ---------------------------------------------------------
  const NODE_RADIUS_MIN = 2;
  const NODE_RADIUS_MAX = 6;
  const MAX_SPEED = 0.28;
  const MIN_SPEED = 0.05; // floor - keeps the graph subtly "alive"
  const DRIFT = 0.08; // random impulse per frame
  const INIT_SPEED = 0.4;
  const DAMPING = 0.995;
  const REPULSION_DIST = 26;
  const REPULSION_DIST_SQ = REPULSION_DIST * REPULSION_DIST;
  const REPULSION_STRENGTH = 0.04;
  const MOUSE_DIST = 190;
  const MOUSE_DIST_SQ = MOUSE_DIST * MOUSE_DIST;
  const MOUSE_STRENGTH = 1.1;
  const SOFT_X_FRAC = 0.6; // soft left boundary - nodes are nudged back right past this
  const CONTAIN_FORCE = 0.06;
  // Edge degree distribution [1,2,3,4 nearest neighbours].
  const EDGE_PICK = [0.2, 0.42, 0.3, 0.08];

  type Node = { x: number; y: number; vx: number; vy: number; r: number };

  let w = 0;
  let h = 0;
  let nodes: Node[] = [];
  let edges: Array<[number, number]> = [];
  let gradient: CanvasGradient | null = null;
  let mouseX = -9999;
  let mouseY = -9999;

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  function buildGradient(): CanvasGradient {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#FB6E00'); // orange at the top
    g.addColorStop(0.55, '#FF9500');
    g.addColorStop(1, '#FFC500'); // yellow at the bottom
    return g;
  }

  function sampleDegree(): number {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < EDGE_PICK.length; i++) {
      acc += EDGE_PICK[i];
      if (r < acc) return i + 1;
    }
    return EDGE_PICK.length;
  }

  // Jittered grid → one candidate point per cell.
  function jitteredGrid(total: number): Array<[number, number]> {
    const aspect = w / h;
    const cols = Math.max(1, Math.round(Math.sqrt(total * aspect)));
    const rows = Math.max(1, Math.ceil(total / cols));
    const cellW = w / cols;
    const cellH = h / rows;
    const pts: Array<[number, number]> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        pts.push([(c + Math.random()) * cellW, (r + Math.random()) * cellH]);
      }
    }
    return pts;
  }

  function buildEdges() {
    edges = [];
    const seen = new Set<number>();
    const buf: Array<{ idx: number; d2: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
      const k = sampleDegree();
      buf.length = 0;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        buf.push({ idx: j, d2: dx * dx + dy * dy });
      }
      buf.sort((a, b) => a.d2 - b.d2);
      for (let n = 0; n < k && n < buf.length; n++) {
        const a = Math.min(i, buf[n].idx);
        const b = Math.max(i, buf[n].idx);
        const key = a * 65536 + b;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([a, b]);
        }
      }
    }
  }

  function init() {
    const target = Math.min(70, Math.max(22, Math.round((w * h) / 16000)));
    const candidates = jitteredGrid(target * 4);

    // Keep the graph on the RIGHT side of the hero so it never collides with the
    // (centered) hero text. Dense at the far-right edge, fading to nothing well
    // before the middle.
    const kept = candidates.filter(([x]) => {
      const fx = x / w; // 0 = left edge, 1 = right edge
      if (fx < 0.5) return false;
      const keepProb = Math.pow((fx - 0.5) / 0.5, 1.2);
      return Math.random() < keepProb;
    });

    // Shuffle then slice for a fair sample across the whole band.
    for (let i = kept.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [kept[i], kept[j]] = [kept[j], kept[i]];
    }

    nodes = kept.slice(0, target).map(([x, y]) => ({
      x,
      y,
      vx: (Math.random() - 0.5) * INIT_SPEED,
      vy: (Math.random() - 0.5) * INIT_SPEED,
      r: rand(NODE_RADIUS_MIN, NODE_RADIUS_MAX),
    }));

    buildEdges();
    gradient = buildGradient();
  }

  function setSize() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    init();
  }

  function tick() {
    // Pairwise repulsion (O(n²), fine for < ~90 nodes).
    for (let i = 0; i < nodes.length; i++) {
      const ni = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const nj = nodes[j];
        const dx = nj.x - ni.x;
        const dy = nj.y - ni.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < REPULSION_DIST_SQ) {
          const dist = Math.sqrt(d2);
          const force = ((REPULSION_DIST - dist) / dist) * REPULSION_STRENGTH;
          ni.vx -= dx * force;
          ni.vy -= dy * force;
          nj.vx += dx * force;
          nj.vy += dy * force;
        }
      }
    }

    const softX = w * SOFT_X_FRAC;
    for (const n of nodes) {
      // Soft containment: gently push nodes back toward the right past the boundary.
      if (n.x < softX) {
        n.vx += ((softX - n.x) / (w * 0.15)) * CONTAIN_FORCE;
      }

      // Cursor repulsion.
      const mdx = n.x - mouseX;
      const mdy = n.y - mouseY;
      const md2 = mdx * mdx + mdy * mdy;
      if (md2 > 0 && md2 < MOUSE_DIST_SQ) {
        const dist = Math.sqrt(md2);
        const force = ((MOUSE_DIST - dist) / MOUSE_DIST) * MOUSE_STRENGTH;
        n.vx += (mdx / dist) * force;
        n.vy += (mdy / dist) * force;
      }

      n.vx += (Math.random() - 0.5) * DRIFT;
      n.vy += (Math.random() - 0.5) * DRIFT;
      n.vx *= DAMPING;
      n.vy *= DAMPING;

      const speed = Math.hypot(n.vx, n.vy);
      if (speed > MAX_SPEED) {
        n.vx = (n.vx / speed) * MAX_SPEED;
        n.vy = (n.vy / speed) * MAX_SPEED;
      } else if (speed < MIN_SPEED) {
        if (speed < 1e-4) {
          const a = Math.random() * Math.PI * 2;
          n.vx = Math.cos(a) * MIN_SPEED;
          n.vy = Math.sin(a) * MIN_SPEED;
        } else {
          n.vx = (n.vx / speed) * MIN_SPEED;
          n.vy = (n.vy / speed) * MIN_SPEED;
        }
      }

      n.x += n.vx;
      n.y += n.vy;

      // Hard bounce off the canvas edges.
      if (n.x < n.r) {
        n.x = n.r;
        n.vx = -n.vx;
      } else if (n.x > w - n.r) {
        n.x = w - n.r;
        n.vx = -n.vx;
      }
      if (n.y < n.r) {
        n.y = n.r;
        n.vy = -n.vy;
      } else if (n.y > h - n.r) {
        n.y = h - n.r;
        n.vy = -n.vy;
      }
    }

    draw();
  }

  function draw() {
    if (!gradient) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = gradient;

    // Edges (faint).
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const [a, b] of edges) {
      ctx.moveTo(nodes[a].x, nodes[a].y);
      ctx.lineTo(nodes[b].x, nodes[b].y);
    }
    ctx.stroke();

    // Nodes.
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (const n of nodes) {
      ctx.moveTo(n.x + n.r, n.y);
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    }
    ctx.fill();

    // Dissolve the left side so the graph fades out before the centered text.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.5, 'rgba(0,0,0,1)');
    fade.addColorStop(0.68, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  setSize();
  tick(); // paint an initial frame immediately, before rAF kicks in

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x >= 0 && x <= w && y >= 0 && y <= h) {
      mouseX = x;
      mouseY = y;
    } else {
      mouseX = -9999;
      mouseY = -9999;
    }
  };

  let raf = 0;
  let visible = true;
  const FRAME_MS = 1000 / 30;
  let last = 0;

  if (reduced) {
    tick(); // single static frame
  } else {
    const loop = (t: number) => {
      if (visible && t - last >= FRAME_MS) {
        tick();
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
  }

  const ro = new ResizeObserver(() => setSize());
  ro.observe(host);

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (visible = e.isIntersecting)),
    { threshold: 0 },
  );
  io.observe(canvas);

  cleanup = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMouseMove);
    ro.disconnect();
    io.disconnect();
    canvas.remove();
  };
});

onUnmounted(() => cleanup?.());
</script>

<template>
  <!-- Placeholder; the real canvas is imperatively attached to .VPHero. -->
  <div ref="mount" class="hero-graph-mount" aria-hidden="true" />
</template>

<style scoped>
.hero-graph-mount {
  display: none;
}
</style>
