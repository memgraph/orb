import { Emitter } from '../utils/emitter.utils';
import { IOrbView } from '../views/shared';
import { OrbEventType, IOrbEventBackgroundDrag } from '../events';
import { getRectangleFromPoints, IPosition, RectangleArea } from '../common';
import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';
import {
  CLASS_NAME,
  DEFAULT_RECTANGLE_SELECTION_STYLE,
  IRectangleSelectionMode,
  IRectangleSelectionOptions,
  IRectangleSelectionStyle,
  RectangleSelectionEvents,
  RectangleSelectionEventType,
} from './shared';

// A drawn box reads as a fresh selection, matching desktop marquee convention: a plain
// Shift-drag replaces the selection, holding Ctrl/Cmd adds to it. Incremental additions
// are still one gesture away (Ctrl/Cmd + Shift-drag, or Shift-click a node when multiselect
// is enabled - both leave the existing selection intact).
const DEFAULT_RESOLVE_MODE = (event: MouseEvent): IRectangleSelectionMode =>
  event.ctrlKey || event.metaKey ? 'add' : 'replace';

// Below this canvas-pixel span in both axes the gesture is treated as a click, not a
// marquee: selection is left untouched and no `select` event fires. Guards against a
// stray Shift-click (a zero-area drag) wiping the selection in the default `replace` mode.
const MIN_DRAG_PX = 3;

// Marquee selection built on Orb's public API: it listens for the view's neutral
// BACKGROUND_DRAG_* events, draws its own DOM overlay, and applies the selection
// via getNodesInArea + selectNodesByIds. Requires background drag to be enabled on
// the view (interaction.backgroundDrag).
export class RectangleSelection<N extends INodeBase, E extends IEdgeBase> extends Emitter<
  RectangleSelectionEvents<N, E>
> {
  private readonly _view: IOrbView<N, E, any>;
  private readonly _resolveMode: (event: MouseEvent) => IRectangleSelectionMode;
  private readonly _style: IRectangleSelectionStyle;

  private _overlay?: HTMLDivElement;
  private _start?: { canvas: IPosition; simulation: IPosition };
  private _previousCursor?: string;

  constructor(view: IOrbView<N, E, any>, options?: IRectangleSelectionOptions) {
    super();
    this._view = view;
    this._resolveMode = options?.resolveMode ?? DEFAULT_RESOLVE_MODE;
    this._style = { ...DEFAULT_RECTANGLE_SELECTION_STYLE, ...options?.style };

    this._view.events.on(OrbEventType.BACKGROUND_DRAG_START, this._onDragStart);
    this._view.events.on(OrbEventType.BACKGROUND_DRAG, this._onDrag);
    this._view.events.on(OrbEventType.BACKGROUND_DRAG_END, this._onDragEnd);
  }

  // Detaches all listeners and removes any lingering overlay.
  destroy(): void {
    this._view.events.off(OrbEventType.BACKGROUND_DRAG_START, this._onDragStart);
    this._view.events.off(OrbEventType.BACKGROUND_DRAG, this._onDrag);
    this._view.events.off(OrbEventType.BACKGROUND_DRAG_END, this._onDragEnd);
    this._removeOverlay();
    this.removeAllListeners();
  }

  private _onDragStart = (event: IOrbEventBackgroundDrag): void => {
    this._start = { canvas: event.globalPoint, simulation: event.localPoint };
    this._createOverlay();
    this._updateOverlay(event.globalPoint);
  };

  private _onDrag = (event: IOrbEventBackgroundDrag): void => {
    if (!this._start) {
      return;
    }
    this._updateOverlay(event.globalPoint);
  };

  private _onDragEnd = (event: IOrbEventBackgroundDrag): void => {
    if (!this._start) {
      this._removeOverlay();
      return;
    }

    // A gesture below the drag threshold (e.g. a Shift-click) is not a marquee: leave the
    // selection alone and emit nothing, so it doesn't clear the selection in `replace` mode.
    const dx = Math.abs(event.globalPoint.x - this._start.canvas.x);
    const dy = Math.abs(event.globalPoint.y - this._start.canvas.y);
    if (dx < MIN_DRAG_PX && dy < MIN_DRAG_PX) {
      this._removeOverlay();
      this._start = undefined;
      return;
    }

    const area = RectangleArea.fromPoints(this._start.simulation, event.localPoint);
    const nodes = this._view.data.getNodesInArea(area);
    const mode = this._resolveMode(event.event);

    if (mode === 'replace') {
      this._view.interaction.unselectAll();
    }
    this._view.interaction.selectNodesByIds(nodes.map((node) => node.getId()));

    this._view.render();
    this._removeOverlay();
    this._start = undefined;

    this.emit(RectangleSelectionEventType.SELECT, { nodes, area, mode });
  };

  private _createOverlay(): void {
    const canvas = this._view.canvas;
    const container = canvas.parentElement;
    if (!container) {
      return;
    }

    // The overlay is absolutely positioned, so the container needs to be a positioning context.
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = CLASS_NAME;
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.boxSizing = 'border-box';
    overlay.style.left = '0px';
    overlay.style.top = '0px';
    overlay.style.width = '0px';
    overlay.style.height = '0px';
    overlay.style.background = this._style.fillColor;
    overlay.style.border = `${this._style.borderWidth}px ${this._style.borderStyle} ${this._style.borderColor}`;
    overlay.style.borderRadius = `${this._style.borderRadius}px`;
    container.appendChild(overlay);
    this._overlay = overlay;

    this._previousCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';
  }

  private _updateOverlay(currentCanvas: IPosition): void {
    if (!this._overlay || !this._start) {
      return;
    }

    // The canvas fills the container at (0, 0), so canvas pixels are container pixels.
    const rectangle = getRectangleFromPoints(this._start.canvas, currentCanvas);
    this._overlay.style.left = `${rectangle.x}px`;
    this._overlay.style.top = `${rectangle.y}px`;
    this._overlay.style.width = `${rectangle.width}px`;
    this._overlay.style.height = `${rectangle.height}px`;
  }

  private _removeOverlay(): void {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = undefined;
    }
    if (this._previousCursor !== undefined) {
      this._view.canvas.style.cursor = this._previousCursor;
      this._previousCursor = undefined;
    }
  }
}
