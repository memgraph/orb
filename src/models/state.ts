// Enum is dismissed so user can define custom additional events (numbers)
export const GraphObjectState = {
  NONE: 0,
  SELECTED: 1,
  HOVERED: 2,
};

export interface ISetStateOptions {
  isToggle?: boolean;
  isSingle?: boolean;
}
