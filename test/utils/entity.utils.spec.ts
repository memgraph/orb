import { EntityState } from '../../src/utils/entity.utils';

interface ITestState {
  id: number;
  name: string;
  value?: number;
}

describe('entity.utils', () => {
  describe('EntityState', () => {
    describe('without sort', () => {
      const items: ITestState[] = [
        { id: 1, name: 'One' },
        { id: 2, name: 'Two' },
        { id: 3, name: 'Three' },
      ];

      const createDefaultState = (initialItems?: ITestState[]) => {
        const state = new EntityState<number, ITestState>({
          getId: (item) => item.id,
        });

        if (initialItems) {
          state.setMany(initialItems);
        }

        return state;
      };

      test('should have size zero on init', () => {
        const state = createDefaultState();

        expect(state.size).toEqual(0);
      });

      test('should create entities one by one', () => {
        const state = createDefaultState();
        items.forEach((item) => {
          state.setOne(item);
        });

        expect(state.size).toEqual(items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          expect(state.getOne(item.id)?.name).toEqual(item.name);
        }
        expect(state.getAll()).toEqual(items);
        expect(state.getMany(items.map((i) => i.id))).toEqual(items);
      });

      test('should create multiple entities in a single call', () => {
        const state = createDefaultState();
        state.setMany(items);

        expect(state.size).toEqual(items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          expect(state.getOne(item.id)?.name).toEqual(item.name);
        }
        expect(state.getAll()).toEqual(items);
        expect(state.getMany(items.map((i) => i.id))).toEqual(items);
      });

      test('should overwrite entities with one single id one by one', () => {
        const state = new EntityState<number, ITestState>({
          getId: () => 1,
        });
        items.forEach((item) => {
          state.setOne(item);
        });

        expect(state.size).toEqual(1);
        expect(state.getOne(1)?.name).toEqual(items[items.length - 1].name);
        expect(state.getOne(2)).toBeUndefined();
        expect(state.getOne(3)).toBeUndefined();
      });

      test('should overwrite entities with one single id in a single call', () => {
        const state = new EntityState<number, ITestState>({
          getId: () => 1,
        });
        state.setMany(items);

        expect(state.size).toEqual(1);
        expect(state.getOne(1)?.name).toEqual(items[items.length - 1].name);
        expect(state.getOne(2)).toBeUndefined();
        expect(state.getOne(3)).toBeUndefined();
      });

      test('should return empty array for missing ids', () => {
        const state = createDefaultState(items);
        const maxId = Math.max(...items.map((item) => item.id));

        expect(state.getMany([maxId + 1, maxId + 2, maxId + 3])).toEqual([]);
      });

      test('should return filtered items by custom function', () => {
        const state = createDefaultState(items);
        const filterBy = (item: ITestState) => item.name.length > 3;
        const filteredItems = items.filter(filterBy);

        expect(state.getAll({ filterBy })).toEqual(filteredItems);
      });

      test('should remove found distinct entities', () => {
        const state = createDefaultState(items);
        const removeIds = [5, 2, 4, 2];
        const existingItems = items.filter((item) => !removeIds.includes(item.id));
        state.removeMany(removeIds);

        expect(state.size).toEqual(existingItems.length);
        for (let i = 0; i < existingItems.length; i++) {
          const item = existingItems[i];
          expect(state.getOne(item.id)?.name).toEqual(item.name);
        }
        expect(state.getAll()).toEqual(existingItems);
        expect(state.getMany(existingItems.map((i) => i.id))).toEqual(existingItems);
      });

      test('should remove all', () => {
        const state = createDefaultState(items);
        state.removeAll();

        expect(state.size).toEqual(0);
      });
    });

    describe('with sort', () => {
      const items: ITestState[] = [
        { id: 1, name: 'One' },
        { id: 2, name: 'Two', value: 10 },
        { id: 3, name: 'Three', value: 1 },
        { id: 4, name: 'Four' },
        { id: 5, name: 'Five', value: 1 },
      ];
      const sortBy = (item1: ITestState, item2: ITestState) => (item1.value ?? 0) - (item2.value ?? 0);
      const sortedItems = items.sort(sortBy);

      const createDefaultState = (initialItems?: ITestState[]) => {
        const state = new EntityState<number, ITestState>({
          getId: (item) => item.id,
          sortBy,
        });

        if (initialItems) {
          state.setMany(initialItems);
        }

        return state;
      };

      test('should have size zero on init', () => {
        const state = createDefaultState();

        expect(state.size).toEqual(0);
      });

      test('should create entities one by one', () => {
        const state = createDefaultState();
        items.forEach((item) => {
          state.setOne(item);
        });

        expect(state.size).toEqual(items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          expect(state.getOne(item.id)?.name).toEqual(item.name);
        }
        expect(state.getAll()).toEqual(sortedItems);
        expect(state.getMany(items.map((i) => i.id))).toEqual(sortedItems);
      });

      test('should create multiple entities in a single call', () => {
        const state = createDefaultState();
        state.setMany(items);

        expect(state.size).toEqual(items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          expect(state.getOne(item.id)?.name).toEqual(item.name);
        }
        expect(state.getAll()).toEqual(sortedItems);
        expect(state.getMany(items.map((i) => i.id))).toEqual(sortedItems);
      });

      test('should overwrite entities with one single id one by one', () => {
        const state = new EntityState<number, ITestState>({
          getId: () => 1,
          sortBy,
        });
        items.forEach((item) => {
          state.setOne(item);
        });

        expect(state.size).toEqual(1);
        expect(state.getOne(1)?.name).toEqual(items[items.length - 1].name);
        expect(state.getOne(2)).toBeUndefined();
        expect(state.getOne(3)).toBeUndefined();
      });

      test('should overwrite entities with one single id in a single call', () => {
        const state = new EntityState<number, ITestState>({
          getId: () => 1,
          sortBy,
        });
        const finalItem = sortedItems[sortedItems.length - 1];
        state.setMany(items);

        expect(state.size).toEqual(1);
        expect(state.getOne(1)?.name).toEqual(finalItem.name);
        expect(state.getOne(2)).toBeUndefined();
        expect(state.getOne(3)).toBeUndefined();
      });

      test('should return empty array for missing ids', () => {
        const state = createDefaultState(items);
        const maxId = Math.max(...items.map((item) => item.id));

        expect(state.getMany([maxId + 1, maxId + 2, maxId + 3])).toEqual([]);
      });

      test('should return filtered items by custom function', () => {
        const state = createDefaultState(items);
        const filterBy = (item: ITestState) => item.name.length > 3;
        const filteredItems = sortedItems.filter(filterBy);

        expect(state.getAll({ filterBy })).toEqual(filteredItems);
      });

      test('should remove found distinct entities', () => {
        const state = createDefaultState(items);
        const removeIds = [7, 2, 4, 2, 1, 1];
        const existingItems = sortedItems.filter((item) => !removeIds.includes(item.id));
        state.removeMany(removeIds);

        expect(state.size).toEqual(existingItems.length);
        for (let i = 0; i < existingItems.length; i++) {
          const item = existingItems[i];
          expect(state.getOne(item.id)?.name).toEqual(item.name);
        }
        expect(state.getAll()).toEqual(existingItems);
        expect(state.getMany(existingItems.map((i) => i.id))).toEqual(existingItems);
      });

      test('should remove all', () => {
        const state = createDefaultState(items);
        state.removeAll();

        expect(state.size).toEqual(0);
      });
    });
  });
});
