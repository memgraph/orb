export interface IObserver {
  update(): void;
}

export interface ISubject {
  listeners: IObserver[];

  addListener(observer: IObserver): void;

  getListeners(): IObserver[];

  removeListener(observer: IObserver): void;

  notifyListeners(): void;
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
    if (!this.listeners.includes(observer)) {
      this.listeners.push(observer);
    }
  }

  notifyListeners(): void {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i].update();
    }
  }
}
