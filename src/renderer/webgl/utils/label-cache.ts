const ATLAS_WIDTH = 2048;
const ATLAS_HEIGHT = 2048;
const RASTER_FONT_PX = 48;
const FONT_LINE_SPACING = 1.2;
const FONT_BACKGROUND_MARGIN = 0.12;
const PADDING = 2;

export interface LabelAtlasEntry {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  pxWidth: number;
  pxHeight: number;
}

interface Shelf {
  y: number;
  height: number;
  x: number;
}

export class LabelCache {
  private _gl: WebGL2RenderingContext;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _texture: WebGLTexture | null = null;
  private _cache = new Map<string, LabelAtlasEntry>();
  private _shelves: Shelf[] = [];
  private _dirty = false;
  private _textureAllocated = false;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
    this._canvas = document.createElement('canvas');
    this._canvas.width = ATLAS_WIDTH;
    this._canvas.height = ATLAS_HEIGHT;
    this._ctx = this._canvas.getContext('2d', { willReadFrequently: false })!;
    this._texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  getOrCreate(
    text: string,
    fontSize: number,
    fontFamily: string,
    fontColor: string,
    bgColor: string | null,
  ): LabelAtlasEntry | null {
    const key = `${text}|${fontSize}|${fontFamily}|${fontColor}|${bgColor ?? ''}`;
    const cached = this._cache.get(key);
    if (cached) {
      return cached;
    }

    const lines = text.split('\n').map((l) => l.trim());
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
      return null;
    }

    const ctx = this._ctx;
    const fontStr = `${RASTER_FONT_PX}px ${fontFamily}`;
    ctx.font = fontStr;

    let maxLineWidth = 0;
    for (let i = 0; i < lines.length; i++) {
      const w = ctx.measureText(lines[i]).width;
      if (w > maxLineWidth) {
        maxLineWidth = w;
      }
    }

    const margin = RASTER_FONT_PX * FONT_BACKGROUND_MARGIN;
    const lineHeight = RASTER_FONT_PX * FONT_LINE_SPACING;
    const textBlockHeight = RASTER_FONT_PX + (lines.length - 1) * lineHeight;
    const pxWidth = Math.ceil(maxLineWidth + margin * 2) + PADDING * 2;
    const pxHeight = Math.ceil(textBlockHeight + margin * 2) + PADDING * 2;

    const slot = this._allocate(pxWidth, pxHeight);
    if (!slot) {
      return null;
    }

    const ox = slot.x + PADDING;
    const oy = slot.y + PADDING;

    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(ox, oy, pxWidth - PADDING * 2, pxHeight - PADDING * 2);
    }

    ctx.font = fontStr;
    ctx.fillStyle = fontColor;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    const centerX = ox + (pxWidth - PADDING * 2) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], centerX, oy + margin + i * lineHeight);
    }

    const entry: LabelAtlasEntry = {
      u0: slot.x / ATLAS_WIDTH,
      v0: slot.y / ATLAS_HEIGHT,
      u1: (slot.x + pxWidth) / ATLAS_WIDTH,
      v1: (slot.y + pxHeight) / ATLAS_HEIGHT,
      pxWidth,
      pxHeight,
    };

    this._cache.set(key, entry);
    this._dirty = true;
    return entry;
  }

  bind(unit: number): void {
    const gl = this._gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
  }

  uploadIfDirty(): void {
    if (!this._dirty) {
      return;
    }

    const gl = this._gl;
    gl.bindTexture(gl.TEXTURE_2D, this._texture);

    if (!this._textureAllocated) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS_WIDTH, ATLAS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this._textureAllocated = true;
    }

    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);

    gl.bindTexture(gl.TEXTURE_2D, null);
    this._dirty = false;
  }

  clear(): void {
    this._cache.clear();
    this._shelves = [];
    this._dirty = false;
    this._ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
  }

  get rasterFontPx(): number {
    return RASTER_FONT_PX;
  }

  private _allocate(w: number, h: number): { x: number; y: number } | null {
    for (let i = 0; i < this._shelves.length; i++) {
      const shelf = this._shelves[i];
      if (shelf.x + w <= ATLAS_WIDTH && h <= shelf.height) {
        const pos = { x: shelf.x, y: shelf.y };
        shelf.x += w;
        return pos;
      }
    }

    const shelfY =
      this._shelves.length === 0
        ? 0
        : this._shelves[this._shelves.length - 1].y + this._shelves[this._shelves.length - 1].height;

    if (shelfY + h > ATLAS_HEIGHT) {
      return null;
    }

    const newShelf: Shelf = { y: shelfY, height: h, x: w };
    this._shelves.push(newShelf);
    return { x: 0, y: shelfY };
  }
}
