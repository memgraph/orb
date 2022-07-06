// Reference: https://rjzaworski.com/2019/10/event-emitters-in-typescript
type EventMap = Record<string, any>;
type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: T) => void;

export interface IEmitter<T extends EventMap> {
  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
  off<K extends EventKey<T>>(eventName: K): void;
  emit<K extends EventKey<T>>(eventName: K, params: T[K]): void;
  size(): number;
}

export class Emitter<T extends EventMap> implements IEmitter<T> {
  private readonly eventListeners = new Map<EventKey<T>, EventReceiver<T[any]>>();

  on<K extends EventKey<T>>(eventName: K, listener: EventReceiver<T[K]>): void {
    if (this.eventListeners.has(eventName)) {
      throw new Error(`Event listener is already listening on event ${eventName}`);
    }
    this.eventListeners.set(eventName, listener);
  }

  off<K extends EventKey<T>>(eventName: K): void {
    this.eventListeners.delete(eventName);
  }

  emit<K extends EventKey<T>>(eventName: K, params: T[K]): void {
    const listener = this.eventListeners.get(eventName);
    if (listener) {
      listener(params);
    }
  }

  size(): number {
    return this.eventListeners.size;
  }
}
