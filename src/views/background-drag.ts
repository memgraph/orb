export type IBackgroundDragModifier = 'shift' | 'ctrl' | 'alt' | 'meta' | null;

export interface IBackgroundDragSettings {
  isEnabled: boolean;
  // `null` claims every background drag (disabling drag-to-pan). Defaults to 'shift'.
  modifier?: IBackgroundDragModifier;
}

// Sentinel returned by OrbView.dragSubject to route an empty-canvas drag to the
// background-drag handlers instead of node dragging.
export interface IBackgroundDragSubject {
  isBackgroundDrag: true;
}

export const BACKGROUND_DRAG_SUBJECT: IBackgroundDragSubject = { isBackgroundDrag: true };

export const isBackgroundDragSubject = (subject: unknown): subject is IBackgroundDragSubject =>
  !!subject && (subject as IBackgroundDragSubject).isBackgroundDrag === true;
