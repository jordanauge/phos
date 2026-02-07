import { describe, it, expect, beforeEach } from 'vitest';
import { NativeArrayProvider } from '../src/providers/NativeArrayProvider.js';
import { SpecManager } from '../src/core/SpecManager.js';

describe('Integration Tests', () => {
  let provider;
  let specManager;
  const employeeData = [
    { id: 1, name: 'Alice', department: 'Engineering > Backend', salary: 120000, location: 'SF', active: true },
    { id: 2, name: 'Bob', department: 'Engineering > Frontend', salary: 110000, location: 'NY', active: true },
    { id: 3, name: 'Charlie', department: 'Sales > Enterprise', salary: 95000, location: 'London', active: false },
    { id: 4, name: 'Diana', department: 'Sales > SMB', salary: 85000, location: 'Austin', active: true },
    { id: 5, name: 'Eve', department: 'HR', salary: 90000, location: 'SF', active: true }
  ];

  beforeEach(async () => {
    provider = new NativeArrayProvider();
    await provider.load(employeeData);

    specManager = new SpecManager({
      dataSource: { type: 'inline', data: employeeData },
      provider: { type: 'native' }
    });
    specManager.setProvider(provider);
  });

  describe('End-to-End Data Flow', () => {
    it('should complete full query pipeline', async () => {
      // 1. Set filters
      specManager.addFilter({ column: 'active', operator: '=', value: true, enabled: true });
      specManager.addFilter({ column: 'salary', operator: '>=', value: 100000, enabled: true });

      // 2. Set sort
      specManager.setSort('salary', 'desc');

      // 3. Set pagination
      specManager.setPagination(1, 10);

      // 4. Execute query
      const result = await specManager.query();

      // 5. Verify results
      expect(result.data).toHaveLength(2); // Alice and Bob
      expect(result.data[0].name).toBe('Alice'); // Highest salary
      expect(result.data[1].name).toBe('Bob');
      expect(result.totalCount).toBe(2);
    });

    it('should handle empty results gracefully', async () => {
      specManager.addFilter({ column: 'name', operator: '=', value: 'NonExistent', enabled: true });

      const result = await specManager.query();

      expect(result.data).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.schema).toBeDefined();
    });

    it('should update results when filters change', async () => {
      // Initial query
      const result1 = await specManager.query();
      expect(result1.totalCount).toBe(5);

      // Add filter
      specManager.addFilter({ column: 'location', operator: '=', value: 'SF', enabled: true });
      const result2 = await specManager.query();
      expect(result2.totalCount).toBe(2); // Alice and Eve

      // Toggle filter
      specManager.toggleFilter('location');
      const result3 = await specManager.query();
      expect(result3.totalCount).toBe(5); // Back to all
    });

    it('should paginate correctly through dataset', async () => {
      specManager.setSort('id', 'asc');
      specManager.setPagination(1, 2);

      const page1 = await specManager.query();
      expect(page1.data.map(d => d.id)).toEqual([1, 2]);

      specManager.setPagination(2, 2);
      const page2 = await specManager.query();
      expect(page2.data.map(d => d.id)).toEqual([3, 4]);

      specManager.setPagination(3, 2);
      const page3 = await specManager.query();
      expect(page3.data.map(d => d.id)).toEqual([5]);
    });
  });

  describe('Schema-Driven Features', () => {
    it('should detect hierarchical columns and extract values', async () => {
      const schema = await provider.getSchema();
      
      expect(schema.types.department).toBe('hierarchy');
      expect(schema.hierarchy.department).toEqual({ delimiter: '>' });

      const deptValues = await provider.getUniqueValues('department');
      expect(deptValues).toContain('Engineering > Backend');
      expect(deptValues).toContain('HR');
    });

    it('should infer correct types for all columns', async () => {
      const schema = await provider.getSchema();
      
      expect(schema.types.id).toBe('number');
      expect(schema.types.name).toBe('string');
      expect(schema.types.salary).toBe('number');
      expect(schema.types.active).toBe('boolean');
    });

    it('should provide unique values for faceted filtering', async () => {
      const locations = await provider.getUniqueValues('location');
      expect(locations).toHaveLength(4);
      expect(locations).toContain('SF');
      expect(locations).toContain('NY');
    });
  });

  describe('Preset Workflows', () => {
    it('should save and apply presets', () => {
      // Create preset
      const preset = {
        name: 'High Earners in Engineering',
        groupBy: 'department',
        filters: [
          { column: 'department', operator: 'LIKE', value: 'Engineering', enabled: true },
          { column: 'salary', operator: '>=', value: 100000, enabled: true }
        ]
      };

      specManager.addPreset(preset);

      // Reset state
      specManager.spec.state.filters = [];
      specManager.spec.state.groupBy = null;

      // Apply preset
      specManager.applyPreset('High Earners in Engineering');

      expect(specManager.getSpec().state.groupBy).toBe('department');
      expect(specManager.getSpec().state.filters).toHaveLength(2);
    });

    it('should export and import complete configuration', async () => {
      // Setup complex state
      specManager.addFilter({ column: 'active', operator: '=', value: true, enabled: true });
      specManager.setSort('salary', 'desc');
      specManager.setPagination(2, 25);
      specManager.setGroupBy('location');
      specManager.setActiveView('hierarchical');
      specManager.addPreset({ name: 'Test', groupBy: 'department' });

      // Export
      const json = specManager.toJSON();

      // Import in new manager
      const imported = SpecManager.fromJSON(json);
      imported.setProvider(provider);

      // Verify state preserved
      const result = await imported.query();
      expect(result.data.every(d => d.active)).toBe(true);
      expect(imported.getSpec().state.activeView).toBe('hierarchical');
      expect(imported.getSpec().presets).toHaveLength(1);
    });
  });

  describe('View-Specific Data Processing', () => {
    it('should group data for hierarchical view', async () => {
      const result = await specManager.query();
      
      // Group by location manually (simulating view logic)
      const grouped = {};
      result.data.forEach(row => {
        const key = row.location;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      });

      expect(Object.keys(grouped)).toHaveLength(4);
      expect(grouped['SF']).toHaveLength(2);
      expect(grouped['NY']).toHaveLength(1);
    });

    it('should build graph structure for graph view', async () => {
      const result = await specManager.query();
      
      // Extract hierarchy for graph (simulating graph view logic)
      const nodes = new Map();
      nodes.set('root', { id: 'root', count: result.totalCount });

      result.data.forEach(row => {
        if (row.department.includes('>')) {
          const parts = row.department.split('>').map(p => p.trim());
          parts.forEach(part => {
            if (!nodes.has(part)) {
              nodes.set(part, { id: part, count: 0 });
            }
            nodes.get(part).count++;
          });
        }
      });

      expect(nodes.has('Engineering')).toBe(true);
      expect(nodes.has('Sales')).toBe(true);
      expect(nodes.get('Engineering').count).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from invalid filter values', async () => {
      specManager.addFilter({ column: 'salary', operator: '>', value: 'invalid', enabled: true });

      // Should not throw, just return no matches
      const result = await specManager.query();
      expect(result.data).toHaveLength(0);
    });

    it('should handle schema access before data load', async () => {
      const emptyProvider = new NativeArrayProvider();
      const emptyManager = new SpecManager();
      emptyManager.setProvider(emptyProvider);

      // Should not throw
      await expect(emptyManager.query()).resolves.toBeDefined();
    });

    it('should handle concurrent state updates', async () => {
      // Simulate rapid user interactions
      specManager.addFilter({ column: 'active', operator: '=', value: true, enabled: true });
      specManager.setSort('salary', 'desc');
      specManager.setPagination(1, 10);
      specManager.setActiveView('grid');

      // All updates should be applied
      const result = await specManager.query();
      expect(result.data.every(d => d.active)).toBe(true);
      expect(specManager.getSpec().state.activeView).toBe('grid');
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 1000 records
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Person ${i}`,
        department: i % 2 === 0 ? 'Engineering' : 'Sales',
        salary: 50000 + (i * 100),
        active: i % 3 !== 0
      }));

      await provider.load(largeDataset);

      const start = Date.now();
      specManager.addFilter({ column: 'active', operator: '=', value: true, enabled: true });
      specManager.setSort('salary', 'desc');
      const result = await specManager.query();
      const duration = Date.now() - start;

      expect(result.totalCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should efficiently filter with multiple conditions', async () => {
      specManager.addFilter({ column: 'active', operator: '=', value: true, enabled: true });
      specManager.addFilter({ column: 'salary', operator: '>=', value: 100000, enabled: true });
      specManager.addFilter({ column: 'location', operator: 'IN', value: ['SF', 'NY'], enabled: true });

      const result = await specManager.query();
      
      // All filters applied
      expect(result.data.every(d => d.active)).toBe(true);
      expect(result.data.every(d => d.salary >= 100000)).toBe(true);
      expect(result.data.every(d => ['SF', 'NY'].includes(d.location))).toBe(true);
    });
  });

});
