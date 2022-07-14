import { IEdgeProperties } from './edge';
import { INodeProperties } from './node';

export type IEdgeStyle = Partial<Omit<IEdgeProperties, 'offset'>>;

export type INodeStyle = Partial<INodeProperties>;

export interface IGraphStyleData {
  nodeStyleById: Record<number, INodeStyle>;
  edgeStyleById: Record<number, IEdgeStyle>;
}

export interface IGraphStyle {
  getNodeStyleById(id: number): INodeStyle | undefined;
  getEdgeStyleById(id: number): IEdgeStyle | undefined;
}

export const parseDataAsGraphStyle = (data: IGraphStyleData): IGraphStyle => {
  return {
    getNodeStyleById(id: number): INodeStyle | undefined {
      return data.nodeStyleById[id];
    },
    getEdgeStyleById(id: number): IEdgeStyle | undefined {
      return data.edgeStyleById[id];
    },
  };
};

export const isGraphStyle = (obj: any): obj is IGraphStyle => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.getNodeStyleById === 'function' &&
    typeof obj.getEdgeStyleById === 'function'
  );
};
