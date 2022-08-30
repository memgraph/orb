export type IWorkerPayload<T, K = void> = K extends void ? { type: T } : { type: T; data: K };
