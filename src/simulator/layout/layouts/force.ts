export interface IForceLayoutOptions {
  centerX?: number;
  centerY?: number;
  nodeDistance?: number;
}

export const DEFAULT_FORCE_LAYOUT_OPTIONS: Required<IForceLayoutOptions> = {
  centerX: 0,
  centerY: 0,
  nodeDistance: 50,
};
