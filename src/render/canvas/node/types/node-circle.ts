import { INodeBase } from '../../../../models/node';
import { IEdgeBase } from '../../../../models/edge';
import { NodeCanvas } from '../base';

export class NodeCircleCanvas<N extends INodeBase, E extends IEdgeBase> extends NodeCanvas<N, E> {}
