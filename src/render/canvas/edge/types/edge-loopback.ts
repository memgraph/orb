import { INodeBase } from '../../../../models/node';
import { IEdgeBase } from '../../../../models/edge';
import { EdgeCanvas } from '../base';

export class EdgeLoopbackCanvas<N extends INodeBase, E extends IEdgeBase> extends EdgeCanvas<N, E> {}
