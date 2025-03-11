/**
 * A key-value model that keeps an order of the elements by
 * the input sort function.
 *
 * Inspired by NgRx/EntityState: https://github.com/ngrx/platform
 */
export interface IEntityState<K, V> {
  getOne(id: K): V | undefined;
  getMany(ids: K[], options?: Partial<IEntityGetOptions<V>>): V[];
  getAll(options?: Partial<IEntityGetOptions<V>>): V[];
  setOne(entity: V): void;
  setMany(entities: V[]): void;
  removeMany(ids: K[]): void;
  removeAll(): void;
  sort(): void;
  size: number;
}

export interface IEntityDefinition<K, V> {
  getId: (entity: V) => K;
  sortBy?: (entity1: V, entity2: V) => number;
}

export interface IEntityGetOptions<V> {
  filterBy: (entity: V) => boolean;
}

export class EntityState<K, V> implements IEntityState<K, V> {
  private ids: K[] = [];
  private entityById: Map<K, V> = new Map<K, V>();
  private getId: IEntityDefinition<K, V>['getId'];
  private sortBy?: IEntityDefinition<K, V>['sortBy'];

  constructor(definition: IEntityDefinition<K, V>) {
    this.getId = definition.getId;
    this.sortBy = definition.sortBy;
  }

  getOne(id: K): V | undefined {
    return this.entityById.get(id);
  }

  getMany(ids: K[], options?: Partial<IEntityGetOptions<V>>): V[] {
    const entities: V[] = [];
    for (let i = 0; i < ids.length; i++) {
      const entity = this.getOne(ids[i]);
      if (entity === undefined) {
        continue;
      }

      if (options?.filterBy && !options.filterBy(entity)) {
        continue;
      }

      entities.push(entity);
    }

    if (this.sortBy) {
      entities.sort(this.sortBy);
    }
    return entities;
  }

  getAll(options?: Partial<IEntityGetOptions<V>>): V[] {
    const entities: V[] = [];
    for (let i = 0; i < this.ids.length; i++) {
      const entity = this.getOne(this.ids[i]);
      if (entity === undefined) {
        continue;
      }

      if (options?.filterBy && !options.filterBy(entity)) {
        continue;
      }

      entities.push(entity);
    }
    return entities;
  }

  setOne(entity: V): void {
    const id = this.getId(entity);
    const isNewEntity = !this.entityById.has(id);

    this.entityById.set(id, entity);
    if (isNewEntity) {
      this.ids.push(id);
      this.sort();
    }
  }

  setMany(entities: V[]): void {
    if (this.sortBy) {
      entities.sort(this.sortBy);
    }

    const newIds: K[] = [];
    for (let i = 0; i < entities.length; i++) {
      const entityId = this.getId(entities[i]);
      if (!this.entityById.has(entityId)) {
        newIds.push(entityId);
      }
      this.entityById.set(entityId, entities[i]);
    }

    this.ids = this.ids.concat(newIds);
    this.sort();
  }

  removeMany(ids: K[]): void {
    const uniqueRemovedIds = new Set<K>(ids);

    const newIds: K[] = [];
    for (let i = 0; i < this.ids.length; i++) {
      if (!uniqueRemovedIds.has(this.ids[i])) {
        newIds.push(this.ids[i]);
      }
    }

    this.ids = newIds;
    for (let i = 0; i < ids.length; i++) {
      this.entityById.delete(ids[i]);
    }
  }

  removeAll(): void {
    this.ids = [];
    this.entityById.clear();
  }

  sort() {
    if (!this.sortBy) {
      return;
    }

    this.ids.sort((id1, id2) => {
      // TypeScript can't see the guard in the upper context
      if (!this.sortBy) {
        return 0;
      }

      const entity1 = this.getOne(id1);
      const entity2 = this.getOne(id2);

      // Should never happen
      if (entity1 === undefined || entity2 === undefined) {
        return 0;
      }

      return this.sortBy(entity1, entity2);
    });
  }

  get size(): number {
    return this.entityById.size;
  }
}
