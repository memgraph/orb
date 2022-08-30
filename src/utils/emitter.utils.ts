// Reference: https://rjzaworski.com/2019/10/event-emitters-in-typescript
export type IEventMap = Record<string, any>;
type IEventKey<T extends IEventMap> = string & keyof T;
type IEventReceiver<T> = (params: T) => void;

export interface IEmitter<T extends IEventMap> {
  once<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T>;
  on<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T>;
  off<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T>;
  emit<K extends IEventKey<T>>(eventName: K, params: T[K]): boolean;
  eventNames<K extends IEventKey<T>>(): K[];
  listenerCount<K extends IEventKey<T>>(eventName: K): number;
  listeners<K extends IEventKey<T>>(eventName: K): IEventReceiver<T[K]>[];
  addListener<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T>;
  removeListener<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T>;
  removeAllListeners<K extends IEventKey<T>>(eventName?: K): IEmitter<T>;
}

interface IEmmiterListener<T extends IEventMap> {
  callable: IEventReceiver<T[any]>;
  isOnce?: boolean;
}

export class Emitter<T extends IEventMap> implements IEmitter<T> {
  private readonly _listeners = new Map<IEventKey<T>, IEmmiterListener<T>[]>();

  /**
   * Adds a one-time listener function for the event named eventName. The next time eventName is
   * triggered, this listener is removed and then invoked.
   *
   * @see {@link https://nodejs.org/api/events.html#emitteronceeventname-listener}
   * @param {IEventKey} eventName Event name
   * @param {IEventReceiver} func Event function
   * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
   */
  once<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T> {
    const newListener: IEmmiterListener<T> = {
      callable: func,
      isOnce: true,
    };

    const listeners = this._listeners.get(eventName);
    if (listeners) {
      listeners.push(newListener);
    } else {
      this._listeners.set(eventName, [newListener]);
    }

    return this;
  }

  /**
   * Adds the listener function to the end of the listeners array for the event named eventName.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of eventName and listener will result in the listener being added,
   * and called, multiple times.
   *
   * @see {@link https://nodejs.org/api/events.html#emitteroneventname-listener}
   * @param {IEventKey} eventName Event name
   * @param {IEventReceiver} func Event function
   * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
   */
  on<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T> {
    const newListener: IEmmiterListener<T> = {
      callable: func,
    };

    const listeners = this._listeners.get(eventName);
    if (listeners) {
      listeners.push(newListener);
    } else {
      this._listeners.set(eventName, [newListener]);
    }

    return this;
  }

  /**
   * Removes the specified listener from the listener array for the event named eventName.
   *
   * @see {@link https://nodejs.org/api/events.html#emitterremovelistenereventname-listener}
   * @param {IEventKey} eventName Event name
   * @param {IEventReceiver} func Event function
   * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
   */
  off<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T> {
    const listeners = this._listeners.get(eventName);
    if (listeners) {
      const filteredListeners = listeners.filter((listener) => listener.callable !== func);
      this._listeners.set(eventName, filteredListeners);
    }

    return this;
  }

  /**
   * Synchronously calls each of the listeners registered for the event named eventName,
   * in the order they were registered, passing the supplied arguments to each.
   * Returns true if the event had listeners, false otherwise.
   *
   * @param {IEventKey} eventName Event name
   * @param {any} params Event parameters
   *
   * @return {boolean} True if the event had listeners, false otherwise
   */
  emit<K extends IEventKey<T>>(eventName: K, params: T[K]): boolean {
    const listeners = this._listeners.get(eventName);
    if (!listeners || listeners.length === 0) {
      return false;
    }

    let hasOnceListener = false;
    for (let i = 0; i < listeners.length; i++) {
      if (listeners[i].isOnce) {
        hasOnceListener = true;
      }
      listeners[i].callable(params);
    }

    if (hasOnceListener) {
      const filteredListeners = listeners.filter((listener) => !listener.isOnce);
      this._listeners.set(eventName, filteredListeners);
    }
    return true;
  }

  /**
   * Returns an array listing the events for which the emitter has registered listeners.
   *
   * @see {@link https://nodejs.org/api/events.html#emittereventnames}
   * @return {IEventKey[]} Event names with registered listeners
   */
  eventNames<K extends IEventKey<T>>(): K[] {
    return [...this._listeners.keys()] as K[];
  }

  /**
   * Returns the number of listeners listening to the event named eventName.
   *
   * @see {@link https://nodejs.org/api/events.html#emitterlistenercounteventname}
   * @param {IEventKey} eventName Event name
   * @return {number} Number of listeners listening to the event name
   */
  listenerCount<K extends IEventKey<T>>(eventName: K): number {
    const listeners = this._listeners.get(eventName);
    return listeners ? listeners.length : 0;
  }

  /**
   * Returns a copy of the array of listeners for the event named eventName.
   *
   * @see {@link https://nodejs.org/api/events.html#emitterlistenerseventname}
   * @param {IEventKey} eventName Event name
   * @return {IEventReceiver[]} Array of listeners for the event name
   */
  listeners<K extends IEventKey<T>>(eventName: K): IEventReceiver<T[K]>[] {
    const listeners = this._listeners.get(eventName);
    if (!listeners) {
      return [];
    }
    return listeners.map((listener) => listener.callable);
  }

  /**
   * Alias for emitter.on(eventName, listener).
   *
   * @see {@link https://nodejs.org/api/events.html#emitteraddlistenereventname-listener}
   * @param {IEventKey} eventName Event name
   * @param {IEventReceiver} func Event function
   * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
   */
  addListener<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T> {
    return this.on<K>(eventName, func);
  }

  /**
   * Alias for emitter.off(eventName, listener).
   *
   * @see {@link https://nodejs.org/api/events.html#emitterremovelistenereventname-listener}
   * @param {IEventKey} eventName Event name
   * @param {IEventReceiver} func Event function
   * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
   */
  removeListener<K extends IEventKey<T>>(eventName: K, func: IEventReceiver<T[K]>): IEmitter<T> {
    return this.off<K>(eventName, func);
  }

  /**
   * Removes all listeners, or those of the specified eventName.
   *
   * @see {@link https://nodejs.org/api/events.html#emitterremovealllistenerseventname}
   * @param {IEventKey} eventName Event name
   * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
   */
  removeAllListeners<K extends IEventKey<T>>(eventName?: K): IEmitter<T> {
    if (eventName) {
      this._listeners.delete(eventName);
    } else {
      this._listeners.clear();
    }

    return this;
  }
}
