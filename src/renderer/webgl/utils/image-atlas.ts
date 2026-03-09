const ATLAS_WIDTH = 2048;
const ATLAS_HEIGHT = 2048;
const MAX_CELL_SIZE = 128;
const PADDING = 2;

export interface ImageAtlasEntry {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  aspect: number;
}

interface Shelf {
  y: number;
  height: number;
  x: number;
}

interface PendingImage {
  image: HTMLImageElement;
  loaded: boolean;
}

export class ImageAtlas {
  private _gl: WebGL2RenderingContext;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _texture: WebGLTexture | null = null;
  private _cache = new Map<string, ImageAtlasEntry>();
  private _pending = new Map<string, PendingImage>();
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

  getOrCreate(url: string): ImageAtlasEntry | null {
    const cached = this._cache.get(url);
    if (cached) {
      return cached;
    }

    const pending = this._pending.get(url);
    if (pending) {
      if (!pending.loaded) {
        return null;
      }
      return this._packImage(url, pending.image);
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';

    const record: PendingImage = { image, loaded: false };
    this._pending.set(url, record);

    image.onload = () => {
      record.loaded = true;
    };
    image.onerror = () => {
      this._pending.delete(url);
    };
    image.src = url;

    return null;
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
    this._pending.clear();
    this._shelves = [];
    this._dirty = false;
    this._ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
  }

  private _packImage(url: string, image: HTMLImageElement): ImageAtlasEntry | null {
    if (!image.naturalWidth || !image.naturalHeight) {
      return null;
    }

    const aspect = image.naturalWidth / image.naturalHeight;

    let drawW: number;
    let drawH: number;
    if (image.naturalWidth >= image.naturalHeight) {
      drawW = Math.min(image.naturalWidth, MAX_CELL_SIZE);
      drawH = Math.round(drawW / aspect);
    } else {
      drawH = Math.min(image.naturalHeight, MAX_CELL_SIZE);
      drawW = Math.round(drawH * aspect);
    }

    const cellW = drawW + PADDING * 2;
    const cellH = drawH + PADDING * 2;

    const slot = this._allocate(cellW, cellH);
    if (!slot) {
      return null;
    }

    this._ctx.drawImage(image, slot.x + PADDING, slot.y + PADDING, drawW, drawH);

    const entry: ImageAtlasEntry = {
      u0: (slot.x + PADDING) / ATLAS_WIDTH,
      v0: (slot.y + PADDING) / ATLAS_HEIGHT,
      u1: (slot.x + PADDING + drawW) / ATLAS_WIDTH,
      v1: (slot.y + PADDING + drawH) / ATLAS_HEIGHT,
      aspect,
    };

    this._cache.set(url, entry);
    this._pending.delete(url);
    this._dirty = true;
    return entry;
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
