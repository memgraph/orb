import { EdgeShape } from '../base';
import { IEdgeBase, INodeBase } from '../../../models/graph.model';

export class EdgeShapeStraight<N extends INodeBase, E extends IEdgeBase> extends EdgeShape<N, E> {}
