import { describe, it, expect, beforeEach } from 'vitest';
import { NativeArrayProvider } from '../src/providers/NativeArrayProvider.js';
import { SpecManager } from '../src/core/SpecManager.js';

/**
 * Regression Tests
 * 
 * These tests specifically address errors seen in production/development:
 * 1. "uniqueValues.map is not a function" - TypeError
 * 2. "element.addEventListener is not a function" - RuntimeError
 * 3. AsyncGenerator issues with Promises
 */
describe('Regression Tests - Bug Prevention', () => {
  let provider;
  let specManager;

  beforeEach(async () => {
    provider = new NativeArrayProvider();
    const data = [
      { id: 1, name: 'Alice', dept: 'Eng', value: 100 },
      { id: 2, name: 'Bob', dept: 'Sales', value: 200 }
    ];
    await provider.load(data);

    specManager = new SpecManager();
    specManager.setProvider(provider);
  });

  describe('Bug: uniqueValues.map is not a function', () => {
    it('should return array from getUniqueValues, not Map object', async () => {
      const values = await provider.getUniqueValues('name');
      
      // CRITICAL: Must be an array
      expect(Array.isArray(values)).toBe(true);
      expect(typeof values.map).toBe('function');
      expect(typeof values.filter).toBe('function');
      expect(typeof values.forEach).toBe('function');
    });

    it('should allow array methods on unique values', async () => {
      const values = await provider.getUniqueValues('dept');
      
      // Should not throw "map is not a function"
      const uppercased = values.map(v => v.toUpperCase());
      expect(uppercased).toEqual(['ENG', 'SALES']);
    });

    it('should handle empty columns without crashing', async () => {
      const emptyData = [{ id: 1, name: null }, { id: 2, name: null }];
      await provider.load(emptyData);

      const values = await provider.getUniqueValues('name');
      expect(Array.isArray(values)).toBe(true);
      expect(values).toHaveLength(0); // Nulls filtered out
    });

    it('should not return Map, Set, or other iterables', async () => {
      const values = await provider.getUniqueValues('id');
      
      expect(values.constructor.name).toBe('Array');
      expect(values instanceof Map).toBe(false);
      expect(values instanceof Set).toBe(false);
    });
  });

  describe('Bug: element.addEventListener is not a function', () => {
    it('should not attempt to add event listeners to spec objects', () => {
      const spec = specManager.getSpec();
      
      // Spec should be plain object, not DOM element
      expect(spec.addEventListener).toBeUndefined();
      expect(spec.nodeType).toBeUndefined();
      expect(typeof spec).toBe('object');
    });

    it('should not create DOM-like objects in state', () => {
      specManager.addFilter({ column: 'name', operator: '=', value: 'Alice', enabled: true });
      
      const filters = specManager.getSpec().state.filters;
      expect(Array.isArray(filters)).toBe(true);
      
      filters.forEach(filter => {
        expect(filter.addEventListener).toBeUndefined();
        expect(filter.nodeType).toBeUndefined();
      });
    });

    it('should return serializable objects only', () => {
      const spec = specManager.getSpec();
      
      // Should be JSON-serializable
      expect(() => JSON.stringify(spec)).not.toThrow();
      
      // Should not contain functions or DOM refs
      const json = JSON.parse(JSON.stringify(spec));
      expect(typeof json).toBe('object');
      expect(json.addEventListener).toBeUndefined();
    });
  });

  describe('Bug: AsyncGenerator and Promise handling', () => {
    it('should return Promises from async methods, not Generators', async () => {
      const queryPromise = specManager.query();
      
      // Should be Promise, not AsyncGenerator
      expect(queryPromise instanceof Promise).toBe(true);
      expect(queryPromise.constructor.name).toBe('Promise');
      expect(typeof queryPromise.then).toBe('function');
      expect(queryPromise.next).toBeUndefined(); // Not a generator
    });

    it('should allow await on all async methods', async () => {
      // All these should be awaitable without errors
      await expect(provider.load([])).resolves.toBeUndefined();
      await expect(provider.query({ filters: [], sort: [], pagination: { limit: 10, offset: 0 } })).resolves.toBeDefined();
      await expect(provider.getUniqueValues('name')).resolves.toBeDefined();
      await expect(provider.getSchema()).resolves.toBeDefined();
      await expect(specManager.query()).resolves.toBeDefined();
    });

    it('should not create generator objects in observable patterns', async () => {
      let callCount = 0;
      
      const unsub = specManager.subscribe(async (spec) => {
        callCount++;
        // This should not create generator
        const result = await specManager.query();
        expect(result.constructor.name).not.toBe('AsyncGenerator');
      });

      specManager.setActiveView('grid');
      
      expect(callCount).toBeGreaterThan(0);
      unsub();
    });
  });

  describe('Bug: Null reference errors in UI', () => {
    it('should handle missing schema gracefully', async () => {
      const emptyProvider = new NativeArrayProvider();
      await emptyProvider.load([]);

      const schema = await emptyProvider.getSchema();
      
      expect(schema.columns).toEqual([]);
      expect(schema.types).toEqual({});
      expect(schema.hierarchy).toEqual({});
    });

    it('should not crash when accessing undefined columns', async () => {
      const result = await specManager.query();
      
      // Accessing non-existent column should not throw
      expect(result.data[0]?.nonExistentColumn).toBeUndefined();
    });

    it('should handle empty presets array', () => {
      const spec = specManager.getSpec();
      
      expect(Array.isArray(spec.presets)).toBe(true);
      expect(spec.presets).toHaveLength(0);
      
      // Should not throw when iterating
      spec.presets.forEach(p => {
        expect(p).toBeDefined();
      });
    });

    it('should handle null groupBy gracefully', () => {
      specManager.setGroupBy(null);
      
      const spec = specManager.getSpec();
      expect(spec.state.groupBy).toBeNull();
      
      // Should not cause errors in transform
      const transform = specManager.toTransformState();
      expect(transform).toBeDefined();
    });
  });

  describe('Bug: Filter operator type errors', () => {
    it('should handle all filter operators without crashing', async () => {
      const operators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];
      
      for (const operator of operators) {
        specManager.spec.state.filters = []; // Reset
        
        let value;
        if (operator === 'IN') value = [100, 200];
        else if (operator === 'BETWEEN') value = [50, 150];
        else if (operator.includes('NULL')) value = null;
        else value = 100;

        specManager.addFilter({ column: 'value', operator, value, enabled: true });
        
        // Should not throw
        await expect(specManager.query()).resolves.toBeDefined();
      }
    });

    it('should handle invalid filter operators without crashing', async () => {
      specManager.addFilter({ column: 'name', operator: 'INVALID_OP', value: 'Alice', enabled: true });
      
      // Should not throw, just return results (default behavior)
      const result = await specManager.query();
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle type mismatches in filters', async () => {
      // String value for numeric column
      specManager.addFilter({ column: 'value', operator: '>', value: 'not-a-number', enabled: true });
      
      const result = await specManager.query();
      expect(result).toBeDefined();
    });
  });

  describe('Bug: Pagination edge cases', () => {
    it('should handle pagination beyond data length', async () => {
      specManager.setPagination(999, 50);
      
      const result = await specManager.query();
      expect(result.data).toEqual([]);
      expect(result.totalCount).toBe(2); // Still shows total
    });

    it('should handle negative page numbers gracefully', async () => {
      specManager.setPagination(-1, 50);
      
      const transform = specManager.toTransformState();
      expect(transform.pagination.offset).toBe(0);
      expect(transform.pagination.limit).toBe(50);
      
      // Should not crash query
      await expect(specManager.query()).resolves.toBeDefined();
    });

    it('should handle zero page size', async () => {
      specManager.setPagination(1, 0);
      
      const result = await specManager.query();
      expect(result.data).toEqual([]);
    });
  });

  describe('Bug: Sort stability', () => {
    it('should maintain stable sort for equal values', async () => {
      const data = [
        { id: 1, priority: 5, name: 'A' },
        { id: 2, priority: 5, name: 'B' },
        { id: 3, priority: 5, name: 'C' }
      ];
      await provider.load(data);

      specManager.setSort('priority', 'asc');
      const result = await specManager.query();
      
      // Order should be preserved for equal values
      const ids = result.data.map(d => d.id);
      expect(ids).toEqual([1, 2, 3]);
    });

    it('should handle sorting null values', async () => {
      const data = [
        { id: 1, value: 100 },
        { id: 2, value: null },
        { id: 3, value: 50 }
      ];
      await provider.load(data);

      specManager.setSort('value', 'asc');
      
      // Should not crash
      await expect(specManager.query()).resolves.toBeDefined();
    });
  });

  describe('Bug: Memory leaks in subscriptions', () => {
    it('should properly remove listeners on unsubscribe', () => {
      const listener1 = () => {};
      const listener2 = () => {};

      const unsub1 = specManager.subscribe(listener1);
      const unsub2 = specManager.subscribe(listener2);

      expect(specManager.listeners.size).toBe(2);

      unsub1();
      expect(specManager.listeners.size).toBe(1);

      unsub2();
      expect(specManager.listeners.size).toBe(0);
    });

    it('should not leak listeners on multiple subscribe/unsubscribe', () => {
      for (let i = 0; i < 100; i++) {
        const unsub = specManager.subscribe(() => {});
        unsub();
      }

      expect(specManager.listeners.size).toBe(0);
    });
  });

  describe('Bug: CSV parsing edge cases', () => {
    it('should handle CSV with commas in values', async () => {
      const csv = 'id,name,desc\n1,"Smith, John","A, B, C"';
      await provider.load(csv);
      
      // This is a known limitation - simple CSV parser
      // Just ensure it doesn't crash
      expect(provider.data).toBeDefined();
    });

    it('should handle empty CSV', async () => {
      const csv = '';
      await provider.load(csv);
      
      expect(provider.data).toEqual([]);
    });

    it('should handle CSV with only headers', async () => {
      const csv = 'id,name,value';
      await provider.load(csv);
      
      expect(provider.data).toEqual([]);
    });
  });

  describe('SpecManager state initialization (Bug: filters undefined)', () => {
    it('should initialize filters array even when state is partially provided', () => {
      const specManager = new SpecManager({
        state: {
          visibleColumns: ['col1', 'col2'],
          filterCategories: { test: ['value'] }
        }
      });

      expect(specManager.getSpec().state.filters).toBeDefined();
      expect(Array.isArray(specManager.getSpec().state.filters)).toBe(true);
      expect(specManager.getSpec().state.filters).toEqual([]);
    });

    it('should preserve all default state properties when partial state provided', () => {
      const specManager = new SpecManager({
        state: {
          visibleColumns: ['col1']
        }
      });

      const state = specManager.getSpec().state;
      expect(state.filters).toEqual([]);
      expect(state.sort).toEqual([]);
      expect(state.pagination).toEqual({ page: 1, pageSize: 50 });
      expect(state.groupBy).toBeNull();
      expect(state.groupLevels).toEqual([]);
      expect(state.visibleColumns).toEqual(['col1']);
      expect(state.columnOrder).toEqual([]);
      expect(state.filterCategories).toEqual({});
      expect(state.activeView).toBe('grid');
    });

    it('should allow overriding default filters', () => {
      const customFilters = [{ column: 'test', operator: '=', value: 'value' }];
      const specManager = new SpecManager({
        state: {
          filters: customFilters
        }
      });

      expect(specManager.getSpec().state.filters).toEqual(customFilters);
    });
  });
});
