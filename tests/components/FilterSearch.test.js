import { describe, it, expect, beforeEach } from 'vitest';
import { FilterSearch } from '../../src/components/FilterSearch.js';

describe('FilterSearch', () => {
  let filterSearch;
  let mockSchema;
  let mockProvider;
  let mockSpecManager;

  beforeEach(() => {
    mockSchema = {
      columns: [
        { name: 'name', type: 'string' },
        { name: 'department', type: 'string' },
        { name: 'salary', type: 'number' },
        { name: 'active', type: 'boolean' }
      ]
    };

    mockProvider = {
      getUniqueValues: async (column) => {
        const values = {
          'name': ['Alice', 'Bob', 'Charlie'],
          'department': ['Engineering', 'Sales', 'Marketing'],
          'salary': [50000, 60000, 70000, 80000],
          'active': [true, false]
        };
        return values[column] || [];
      }
    };

    mockSpecManager = {
      spec: { state: { filters: [] } },
      addFilter: function(filter) {
        this.spec.state.filters.push(filter);
      }
    };

    filterSearch = new FilterSearch(mockSchema, mockProvider, mockSpecManager);
  });

  describe('parseExpression', () => {
    it('should parse key:value format', () => {
      const blocks = filterSearch.parseExpression('department:Engineering');
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'filter',
        column: 'department',
        operator: '=',
        value: 'Engineering'
      });
    });

    it('should parse multiple filters', () => {
      const blocks = filterSearch.parseExpression('department:Engineering location:SF');
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].column).toBe('department');
      expect(blocks[1].column).toBe('location');
    });

    it('should parse operators', () => {
      const tests = [
        { input: 'salary:>50000', operator: '>', value: '50000' },
        { input: 'salary:>=50000', operator: '>=', value: '50000' },
        { input: 'salary:<100000', operator: '<', value: '100000' },
        { input: 'salary:<=100000', operator: '<=', value: '100000' },
        { input: 'name:!=Alice', operator: '!=', value: 'Alice' },
        { input: 'name:~John', operator: 'LIKE', value: 'John' }
      ];

      tests.forEach(test => {
        const blocks = filterSearch.parseExpression(test.input);
        expect(blocks[0].operator).toBe(test.operator);
        expect(blocks[0].value).toBe(test.value);
      });
    });

    it('should parse full-text search', () => {
      const blocks = filterSearch.parseExpression('engineering manager');
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toMatchObject({
        type: 'fulltext',
        value: 'engineering'
      });
      expect(blocks[1]).toMatchObject({
        type: 'fulltext',
        value: 'manager'
      });
    });

    it('should parse mixed filter and full-text', () => {
      const blocks = filterSearch.parseExpression('department:Engineering senior');
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('filter');
      expect(blocks[1].type).toBe('fulltext');
    });

    it('should handle empty input', () => {
      const blocks = filterSearch.parseExpression('');
      expect(blocks).toHaveLength(0);
    });

    it('should handle malformed input gracefully', () => {
      const blocks = filterSearch.parseExpression(':::');
      expect(blocks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('serializeBlocks', () => {
    it('should serialize filter blocks', () => {
      const blocks = [
        { type: 'filter', column: 'department', operator: '=', value: 'Engineering' },
        { type: 'filter', column: 'salary', operator: '>', value: '50000' }
      ];

      const text = filterSearch.serializeBlocks(blocks);
      expect(text).toBe('department:Engineering salary:>50000');
    });

    it('should serialize full-text blocks', () => {
      const blocks = [
        { type: 'fulltext', value: 'engineering' },
        { type: 'fulltext', value: 'manager' }
      ];

      const text = filterSearch.serializeBlocks(blocks);
      expect(text).toBe('engineering manager');
    });

    it('should omit = operator', () => {
      const blocks = [
        { type: 'filter', column: 'name', operator: '=', value: 'Alice' }
      ];

      const text = filterSearch.serializeBlocks(blocks);
      expect(text).toBe('name:Alice');
    });
  });

  describe('getSuggestions', () => {
    it('should suggest column names', async () => {
      const suggestions = await filterSearch.getSuggestions('dep', 3);
      
      expect(suggestions.length).toBeGreaterThan(0);
      const deptSuggestion = suggestions.find(s => s.value === 'department');
      expect(deptSuggestion).toBeDefined();
      expect(deptSuggestion.type).toBe('column');
    });

    it('should suggest values after colon', async () => {
      const suggestions = await filterSearch.getSuggestions('department:Eng', 15);
      
      expect(suggestions.length).toBeGreaterThan(0);
      const engSuggestion = suggestions.find(s => s.value === 'Engineering');
      expect(engSuggestion).toBeDefined();
      expect(engSuggestion.type).toBe('value');
    });

    it('should filter partial matches', async () => {
      const suggestions = await filterSearch.getSuggestions('na', 2);
      
      const nameSuggestion = suggestions.find(s => s.value === 'name');
      expect(nameSuggestion).toBeDefined();
    });

    it('should handle no matches', async () => {
      const suggestions = await filterSearch.getSuggestions('xyz', 3);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('getColumnSuggestions', () => {
    it('should return all columns for empty partial', () => {
      const suggestions = filterSearch.getColumnSuggestions('');
      expect(suggestions).toHaveLength(mockSchema.columns.length);
    });

    it('should filter by partial match', () => {
      const suggestions = filterSearch.getColumnSuggestions('sal');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].value).toBe('salary');
    });

    it('should be case insensitive', () => {
      const suggestions = filterSearch.getColumnSuggestions('DEP');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getValueSuggestions', () => {
    it('should return unique values for column', async () => {
      const suggestions = await filterSearch.getValueSuggestions('department', '');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.type === 'value')).toBe(true);
    });

    it('should filter by partial match', async () => {
      const suggestions = await filterSearch.getValueSuggestions('department', 'Eng');
      
      const engSuggestion = suggestions.find(s => s.value === 'Engineering');
      expect(engSuggestion).toBeDefined();
    });

    it('should limit to 20 suggestions', async () => {
      const manyValues = Array.from({ length: 50 }, (_, i) => `Value${i}`);
      mockProvider.getUniqueValues = async () => manyValues;

      const suggestions = await filterSearch.getValueSuggestions('test', '');
      expect(suggestions.length).toBeLessThanOrEqual(20);
    });

    it('should handle provider errors gracefully', async () => {
      mockProvider.getUniqueValues = async () => {
        throw new Error('Provider error');
      };

      const suggestions = await filterSearch.getValueSuggestions('test', '');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('applyBlocks', () => {
    it('should add filter blocks to spec manager', () => {
      const blocks = [
        { type: 'filter', column: 'department', operator: '=', value: 'Engineering' }
      ];

      filterSearch.applyBlocks(blocks);

      expect(mockSpecManager.spec.state.filters).toHaveLength(1);
      expect(mockSpecManager.spec.state.filters[0]).toMatchObject({
        column: 'department',
        operator: '=',
        value: 'Engineering'
      });
    });

    it('should clear existing filters before applying', () => {
      mockSpecManager.spec.state.filters = [
        { column: 'old', operator: '=', value: 'filter' }
      ];

      const blocks = [
        { type: 'filter', column: 'new', operator: '=', value: 'filter' }
      ];

      filterSearch.applyBlocks(blocks);

      expect(mockSpecManager.spec.state.filters).toHaveLength(1);
      expect(mockSpecManager.spec.state.filters[0].column).toBe('new');
    });

    it('should handle full-text search blocks', () => {
      const blocks = [
        { type: 'fulltext', value: 'engineering' }
      ];

      filterSearch.applyBlocks(blocks);

      // Should create LIKE filters for all string columns
      const stringColumns = mockSchema.columns.filter(c => c.type === 'string');
      expect(mockSpecManager.spec.state.filters.length).toBe(stringColumns.length);
      
      mockSpecManager.spec.state.filters.forEach(filter => {
        expect(filter.operator).toBe('LIKE');
        expect(filter.value).toContain('engineering');
        expect(filter.isFulltext).toBe(true);
      });
    });
  });

  describe('handlePaste', () => {
    it('should parse and apply pasted text', () => {
      filterSearch.handlePaste('department:Engineering salary:>50000');

      expect(filterSearch.filterBlocks).toHaveLength(2);
      expect(mockSpecManager.spec.state.filters).toHaveLength(2);
    });

    it('should append to existing blocks', () => {
      filterSearch.filterBlocks = [
        { type: 'filter', column: 'name', operator: '=', value: 'Alice' }
      ];

      filterSearch.handlePaste('department:Engineering');

      expect(filterSearch.filterBlocks).toHaveLength(2);
    });
  });

  describe('handleCopy', () => {
    it('should serialize current blocks', () => {
      filterSearch.filterBlocks = [
        { type: 'filter', column: 'department', operator: '=', value: 'Engineering' },
        { type: 'filter', column: 'salary', operator: '>', value: '50000' }
      ];

      const text = filterSearch.handleCopy();
      expect(text).toBe('department:Engineering salary:>50000');
    });
  });

  describe('removeBlock', () => {
    it('should remove block at index', () => {
      filterSearch.filterBlocks = [
        { type: 'filter', column: 'a', operator: '=', value: '1' },
        { type: 'filter', column: 'b', operator: '=', value: '2' },
        { type: 'filter', column: 'c', operator: '=', value: '3' }
      ];

      filterSearch.removeBlock(1);

      expect(filterSearch.filterBlocks).toHaveLength(2);
      expect(filterSearch.filterBlocks[1].column).toBe('c');
    });
  });

  describe('reorderBlocks', () => {
    it('should reorder blocks', () => {
      filterSearch.filterBlocks = [
        { type: 'filter', column: 'a', operator: '=', value: '1' },
        { type: 'filter', column: 'b', operator: '=', value: '2' },
        { type: 'filter', column: 'c', operator: '=', value: '3' }
      ];

      filterSearch.reorderBlocks(0, 2);

      expect(filterSearch.filterBlocks[0].column).toBe('b');
      expect(filterSearch.filterBlocks[1].column).toBe('c');
      expect(filterSearch.filterBlocks[2].column).toBe('a');
    });
  });

  describe('getFilterCategories', () => {
    it('should group columns by type', () => {
      const categories = filterSearch.getFilterCategories();

      expect(categories.size).toBeGreaterThan(0);
      expect(categories.has('string')).toBe(true);
      expect(categories.has('number')).toBe(true);
    });

    it('should respect custom categories', () => {
      mockSchema.columns[0].category = 'Personal';
      mockSchema.columns[1].category = 'Personal';

      const categories = filterSearch.getFilterCategories();

      expect(categories.has('Personal')).toBe(true);
      expect(categories.get('Personal')).toHaveLength(2);
    });
  });
});
