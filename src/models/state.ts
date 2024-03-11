import { GraphObject } from '../utils/observer.utils';

// Enum is dismissed so user can define custom additional events (numbers)
export const GraphObjectState = {
  NONE: 0,
  SELECTED: 1,
  HOVERED: 2,
};

export interface IGraphObjectStateOptions {
  isToggle?: boolean;
  isSingle?: boolean;
}

export interface IGraphObjectStateParameters {
  state: number;
  options: IGraphObjectStateOptions;
}

export interface ISetStateDataPayload {
  id: any;
  type: GraphObject;
  options: IGraphObjectStateOptions;
}
