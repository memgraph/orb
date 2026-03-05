import { IPosition } from '../../common';
import { IEmitter } from '../../utils/emitter.utils';
import { DeepPartial } from '../../utils/type.utils';
import { ISimulationNode, ISimulationGraph, ISimulationIds, SimulatorEvents } from '../shared';

export type LayoutType = 'circular' | 'force' | 'grid' | 'hierarchical';

export interface ILayoutOptionsBase {
  anchorX?: 'start' | 'center' | 'end';
  anchorY?: 'start' | 'center' | 'end';
}

export interface ICircularLayoutOptions extends ILayoutOptionsBase {
  radius: number;
  centerX: number;
  centerY: number;
}

export const DEFAULT_CIRCULAR_LAYOUT_OPTIONS: ICircularLayoutOptions = {
  radius: 100,
  centerX: 0,
  centerY: 0,
};

export interface IForceLayoutOptions extends ILayoutOptionsBase {
  isSimulatingOnDataUpdate: boolean;
  isSimulatingOnSettingsUpdate: boolean;
  isSimulatingOnUnstick: boolean;
  isPhysicsEnabled: boolean;
  alpha: IForceLayoutAlpha;
  centering: IForceLayoutCentering | null;
  collision: IForceLayoutCollision | null;
  links: IForceLayoutLinks;
  manyBody: IForceLayoutManyBody | null;
  positioning: IForceLayoutPositioning | null;
}

const MANY_BODY_MAX_DISTANCE_TO_LINK_DISTANCE_RATIO = 100;
const DEFAULT_LINK_DISTANCE = 50;

export const getManyBodyMaxDistance = (linkDistance: number) => {
  const distance = linkDistance > 0 ? linkDistance : 1;
  return distance * MANY_BODY_MAX_DISTANCE_TO_LINK_DISTANCE_RATIO;
};

export const DEFAULT_FORCE_LAYOUT_OPTIONS: IForceLayoutOptions = {
  isSimulatingOnDataUpdate: true,
  isSimulatingOnSettingsUpdate: true,
  isSimulatingOnUnstick: true,
  isPhysicsEnabled: false,
  alpha: {
    alpha: 1,
    alphaMin: 0.05, // default alphaMin is 0.001, which results in 285 ticks to converge. Using 0.05 converges to similar stable results in 106 ticks
    alphaDecay: 0.028,
    alphaTarget: 0,
  },
  centering: {
    x: 0,
    y: 0,
    strength: 1,
  },
  collision: {
    radius: 15,
    strength: 1,
    iterations: 1,
  },
  links: {
    distance: DEFAULT_LINK_DISTANCE,
    strength: 1,
    iterations: 1,
  },
  manyBody: {
    strength: -100,
    theta: 0.9,
    distanceMin: 0,
    distanceMax: getManyBodyMaxDistance(DEFAULT_LINK_DISTANCE),
  },
  positioning: {
    forceX: {
      x: 0,
      strength: 0.1,
    },
    forceY: {
      y: 0,
      strength: 0.1,
    },
  },
  anchorX: 'center',
  anchorY: 'center',
};

export interface IGridLayoutOptions extends ILayoutOptionsBase {
  rowGap: number;
  colGap: number;
}

export const DEFAULT_GRID_LAYOUT_OPTIONS: IGridLayoutOptions = {
  rowGap: 50,
  colGap: 50,
};

export type HierarchicalLayoutOrientation = 'horizontal' | 'vertical';

export interface IHierarchicalLayoutOptions extends ILayoutOptionsBase {
  nodeGap: number;
  levelGap: number;
  treeGap: number;
  orientation: HierarchicalLayoutOrientation;
  reversed: boolean;
}

export const DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS: IHierarchicalLayoutOptions = {
  nodeGap: 50,
  levelGap: 50,
  treeGap: 100,
  orientation: 'vertical',
  reversed: false,
};

export type LayoutSettingsMap = {
  circular: ICircularLayoutOptions;
  force: IForceLayoutOptions;
  grid: IGridLayoutOptions;
  hierarchical: IHierarchicalLayoutOptions;
};

export interface ILayoutSettings {
  type: LayoutType;
  options?: DeepPartial<LayoutSettingsMap[LayoutType]>;
}

export interface IForceLayoutAlpha {
  alpha: number;
  alphaMin: number;
  alphaDecay: number;
  alphaTarget: number;
}

export interface IForceLayoutCentering {
  x: number;
  y: number;
  strength: number;
}

export interface IForceLayoutCollision {
  radius: number;
  strength: number;
  iterations: number;
}

export interface IForceLayoutLinks {
  distance: number;
  strength?: number;
  iterations: number;
}

export interface IForceLayoutManyBody {
  strength: number;
  theta: number;
  distanceMin: number;
  distanceMax: number;
}

export interface IForceLayoutPositioning {
  forceX: {
    x: number;
    strength: number;
  };
  forceY: {
    y: number;
    strength: number;
  };
}

export type IEngineSettingsUpdate =
  | Partial<IForceLayoutOptions>
  | Partial<ICircularLayoutOptions>
  | Partial<IGridLayoutOptions>
  | Partial<IHierarchicalLayoutOptions>;

export interface ILayoutEngine extends IEmitter<SimulatorEvents> {
  readonly type: LayoutType;

  setupData(data: ISimulationGraph): void;
  mergeData(data: ISimulationGraph): void;
  updateData(data: ISimulationGraph): void;
  deleteData(data: Partial<ISimulationIds>): void;
  patchData(data: Partial<ISimulationGraph>): void;
  clearData(): void;

  activateSimulation(): void;
  stopSimulation(): void;

  startDragNode(): void;
  dragNode(nodeId: number, position: IPosition): void;
  endDragNode(nodeId: number): void;
  fixNodes(nodes?: ISimulationNode[]): void;
  releaseNodes(nodes?: ISimulationNode[]): void;

  setSettings(settings: IEngineSettingsUpdate): void;

  terminate(): void;
}
