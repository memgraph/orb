import { INodeCoordinates, INodeMapCoordinates, INodePosition } from '../models/node';

export type IObserverDataPayload = INodePosition | INodeCoordinates | INodeMapCoordinates;

export interface IObserver {
  update(data?: IObserverDataPayload): void;
}

export interface ISubject {
  listeners: IObserver[];

  addListener(observer: IObserver): void;

  getListeners(): IObserver[];

  removeListener(observer: IObserver): void;

  notifyListeners(data?: IObserverDataPayload): void;
}

export class Subject implements ISubject {
  listeners: IObserver[];

  constructor() {
    this.listeners = [];
  }

  addListener(observer: IObserver): void {
    this.listeners.push(observer);
  }

  getListeners(): IObserver[] {
    return [...this.listeners];
  }

  removeListener(observer: IObserver): void {
    const index = this.listeners.indexOf(observer);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners(data?: IObserverDataPayload): void {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i].update(data);
    }
  }
}
