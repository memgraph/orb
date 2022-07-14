import { IGraphStyleData, IGraphStyle, isGraphStyle, parseDataAsGraphStyle } from './models/style/graph-style';
import { Color } from './models/color';
import { INodeStyle } from './models/style/node-style';
import { IEdgeStyle } from './models/style/edge-style';
import { Graph, IGraphData } from './models/graph';
import { INodeBase } from './models/node';
import { IEdgeBase } from './models/edge';

type OrbStyle = IGraphStyleData | IGraphStyle;

interface OrbLoadOptions {
  style: OrbStyle;
}

const DEFAULT_STYLE: IGraphStyle = {
  getNodeStyleById(): INodeStyle {
    return {
      size: 5,
      color: new Color('#000000'),
    };
  },
  getEdgeStyleById(): IEdgeStyle {
    return {
      color: new Color('#999999'),
      width: 0.3,
    };
  },
};

// class OrbData<N extends INodeBase, E extends IEdgeBase> {
//   load(data: Partial<IGraphData<N, E>>, options?: Partial<OrbLoadOptions>) {
//     const graph = new Graph(data);
//     const style = options?.style ?? DEFAULT_STYLE;
//
//     this.topology.setGraph(graph);
//     // TODO: Where to set style callback?
//     this.style(style);
//   }
//
//   join<N extends INodeBase, E extends IEdgeBase>(data: Partial<OrbGraph<N, E>>) {
//     const newGraph = new Graph(data.nodes ?? [], data.edges ?? []);
//     const joinedGraph: Graph<N, E> = this.topology.graph.mergeGraph(newGraph);
//     this.topology.setGraph(joinedGraph);
//   }
//
//   hide<N extends INodeBase, E extends IEdgeBase>(data: Partial<OrbGraph<N, E>>) {
//     const newGraph = new Graph(data.nodes ?? [], data.edges ?? []);
//     const collapsedGraph: Graph<N, E> = this.topology.graph.removeGraph(newGraph);
//     this.topology.setGraph(collapsedGraph);
//   }
//
//   clear() {
//     this.topology.setGraph(new Graph([], []));
//     this.topology.setStyle(DEFAULT_STYLE);
//   }
//
//   // TODO: Where to set callback?
//   style(style: OrbStyle = DEFAULT_STYLE) {
//     if (!isGraphStyle(style)) {
//       style = parseDataAsGraphStyle(style);
//     }
//
//     this.topology.setStyle(style);
//   }
// }

export class Orb<N extends INodeBase, E extends IEdgeBase> {
  // TODO: Return to private after test
  // public topology?: GraphTopology<N, E>;
  public graph?: Graph<N, E>;
  public style: IGraphStyle = DEFAULT_STYLE;

  constructor() {
    // Do nothing
  }

  get data() {
    return {
      load: (data: Partial<IGraphData<N, E>>, options?: Partial<OrbLoadOptions>) => {
        this.graph = new Graph<N, E>(data);
        let style = options?.style ?? this.style;
        if (!isGraphStyle(style)) {
          style = parseDataAsGraphStyle(style);
        }
        this.style = style;
      },
      join: (data: Partial<IGraphData<N, E>>) => {
        if (!this.graph) {
          this.graph = new Graph<N, E>(data);
          return;
        }

        this.graph.join(data);
      },
      hide: (data: Partial<IGraphData<N, E>>) => {
        if (!this.graph) {
          return;
        }

        this.graph.hide(data);
      },
      clear: () => {
        this.graph = undefined;
        this.style = DEFAULT_STYLE;
      },
      style: (style: OrbStyle = DEFAULT_STYLE) => {
        if (!isGraphStyle(style)) {
          style = parseDataAsGraphStyle(style);
        }
        this.style = style;
      },
    };
  }
}
