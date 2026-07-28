import { INode, INodeBase } from './node';
import { IEdge, IEdgeBase } from './edge';
import { IGraph } from './graph';
import { IPosition } from '../common';
import {
  hoverOnlyNode,
  selectOnlyEdge,
  selectOnlyNode,
  toggleEdgeSelection,
  toggleNodeSelection,
  unhoverAll,
  unselectAll,
} from '../utils/graph.utils';

export interface IEventStrategySettings {
  isDefaultSelectEnabled: boolean;
  isDefaultHoverEnabled: boolean;
  isDefaultMultiSelectEnabled: boolean;
  isDefaultSelectCascadeEnabled: boolean;
}

export interface IEventStrategyResponse<N extends INodeBase, E extends IEdgeBase> {
  isStateChanged: boolean;
  changedSubject?: INode<N, E> | IEdge<N, E>;
}

export interface IEventStrategyClickOptions {
  isAppend?: boolean;
}

export interface IEventStrategy<N extends INodeBase, E extends IEdgeBase> {
  isSelectEnabled: boolean;
  isHoverEnabled: boolean;
  isMultiSelectEnabled: boolean;
  isSelectCascadeEnabled: boolean;
  onMouseClick: (
    graph: IGraph<N, E>,
    point: IPosition,
    options?: IEventStrategyClickOptions,
  ) => IEventStrategyResponse<N, E>;
  onMouseMove: (graph: IGraph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>;
  onMouseRightClick: (graph: IGraph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>;
  onMouseDoubleClick: (graph: IGraph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>;
}

export class DefaultEventStrategy<N extends INodeBase, E extends IEdgeBase> implements IEventStrategy<N, E> {
  private _lastHoveredNode?: INode<N, E>;
  public isSelectEnabled: boolean;
  public isHoverEnabled: boolean;
  public isMultiSelectEnabled: boolean;
  public isSelectCascadeEnabled: boolean;

  constructor(settings: IEventStrategySettings) {
    this.isSelectEnabled = settings.isDefaultSelectEnabled;
    this.isHoverEnabled = settings.isDefaultHoverEnabled;
    this.isMultiSelectEnabled = settings.isDefaultMultiSelectEnabled;
    this.isSelectCascadeEnabled = settings.isDefaultSelectCascadeEnabled;
  }

  onMouseClick(
    graph: IGraph<N, E>,
    point: IPosition,
    options?: IEventStrategyClickOptions,
  ): IEventStrategyResponse<N, E> {
    const isAppend = this.isMultiSelectEnabled && (options?.isAppend ?? false);

    const node = graph.getNearestNode(point);
    if (node) {
      if (this.isSelectEnabled) {
        if (isAppend) {
          toggleNodeSelection(node);
        } else {
          selectOnlyNode(graph, node, { cascade: this.isSelectCascadeEnabled });
        }
      }

      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    const edge = graph.getNearestEdge(point);
    if (edge) {
      if (this.isSelectEnabled) {
        if (isAppend) {
          toggleEdgeSelection(edge);
        } else {
          selectOnlyEdge(graph, edge, { cascade: this.isSelectCascadeEnabled });
        }
      }

      return {
        isStateChanged: true,
        changedSubject: edge,
      };
    }

    if (!this.isSelectEnabled || isAppend) {
      return { isStateChanged: false };
    }

    const { changedCount } = unselectAll(graph);
    return {
      isStateChanged: changedCount > 0,
    };
  }

  onMouseMove(graph: IGraph<N, E>, point: IPosition): IEventStrategyResponse<N, E> {
    const node = graph.getNearestNode(point);
    if (node && (!this.isSelectEnabled || (this.isSelectEnabled && !node.isSelected()))) {
      if (node === this._lastHoveredNode) {
        return {
          changedSubject: node,
          isStateChanged: false,
        };
      }

      if (this.isHoverEnabled) {
        hoverOnlyNode(graph, node);
      }

      this._lastHoveredNode = node;
      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    this._lastHoveredNode = undefined;
    if (!node && this.isHoverEnabled) {
      const { changedCount } = unhoverAll(graph);
      return {
        isStateChanged: changedCount > 0,
      };
    }

    return { isStateChanged: false };
  }

  onMouseRightClick(graph: IGraph<N, E>, point: IPosition): IEventStrategyResponse<N, E> {
    const node = graph.getNearestNode(point);
    if (node) {
      if (this.isSelectEnabled) {
        selectOnlyNode(graph, node, { cascade: this.isSelectCascadeEnabled });
      }

      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    const edge = graph.getNearestEdge(point);
    if (edge) {
      if (this.isSelectEnabled) {
        selectOnlyEdge(graph, edge, { cascade: this.isSelectCascadeEnabled });
      }

      return {
        isStateChanged: true,
        changedSubject: edge,
      };
    }

    if (!this.isSelectEnabled) {
      return { isStateChanged: false };
    }

    const { changedCount } = unselectAll(graph);
    return {
      isStateChanged: changedCount > 0,
    };
  }

  onMouseDoubleClick(graph: IGraph<N, E>, point: IPosition): IEventStrategyResponse<N, E> {
    const node = graph.getNearestNode(point);
    if (node) {
      if (this.isSelectEnabled) {
        selectOnlyNode(graph, node, { cascade: this.isSelectCascadeEnabled });
      }

      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    const edge = graph.getNearestEdge(point);
    if (edge) {
      if (this.isSelectEnabled) {
        selectOnlyEdge(graph, edge, { cascade: this.isSelectCascadeEnabled });
      }

      return {
        isStateChanged: true,
        changedSubject: edge,
      };
    }

    if (!this.isSelectEnabled) {
      return { isStateChanged: false };
    }

    const { changedCount } = unselectAll(graph);
    return {
      isStateChanged: changedCount > 0,
    };
  }
}
