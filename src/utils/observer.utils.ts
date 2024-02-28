export interface IObserver {
  update(): void;
}

export interface ISubject {
  addListener(observer: IObserver): void;

  removeListener(observer: IObserver): void;

  notifyListeners(): void;
}
