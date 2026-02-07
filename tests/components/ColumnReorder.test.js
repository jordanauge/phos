import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnReorder } from '../../src/components/ColumnReorder.js';

describe('ColumnReorder', () => {
  let columnReorder;
  let mockSpecManager;
  let mockSchema;

  beforeEach(() => {
    mockSchema = {
      columns: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'department', type: 'string' },
        { name: 'salary', type: 'number' }
      ]
    };

    mockSpecManager = {
      spec: {
        state: {
          columnOrder: [],
          visibleColumns: []
        }
      },
      getSpec: function() {
        return this.spec;
      },
      updateState: function(updates) {
        Object.assign(this.spec.state, updates);
      }
    };

    columnReorder = new ColumnReorder(mockSpecManager, mockSchema);
  });

  describe('getColumnOrder', () => {
    it('should return default schema order when no custom order', () => {
      const order = columnReorder.getColumnOrder();
      
      expect(order).toEqual(['id', 'name', 'email', 'department', 'salary']);
    });

    it('should return custom order when set', () => {
      mockSpecManager.spec.state.columnOrder = ['salary', 'name', 'id', 'email', 'department'];
      
      const order = columnReorder.getColumnOrder();
      expect(order).toEqual(['salary', 'name', 'id', 'email', 'department']);
    });

    it('should return empty array default when columnOrder is empty array', () => {
      mockSpecManager.spec.state.columnOrder = [];
      
      const order = columnReorder.getColumnOrder();
      expect(order).toEqual(['id', 'name', 'email', 'department', 'salary']);
    });
  });

  describe('setColumnOrder', () => {
    it('should update column order in spec manager', () => {
      const newOrder = ['name', 'email', 'id', 'department', 'salary'];
      
      columnReorder.setColumnOrder(newOrder);
      
      expect(mockSpecManager.spec.state.columnOrder).toEqual(newOrder);
    });
  });

  describe('reorderBlocks', () => {
    it('should move column from one position to another', () => {
      mockSpecManager.spec.state.columnOrder = ['id', 'name', 'email', 'department', 'salary'];
      
      // Move 'id' (index 0) to position 2
      const currentOrder = mockSpecManager.spec.state.columnOrder;
      const fromIndex = 0;
      const toIndex = 2;
      const newOrder = [...currentOrder];
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, currentOrder[fromIndex]);
      
      columnReorder.setColumnOrder(newOrder);
      
      expect(mockSpecManager.spec.state.columnOrder).toEqual(['name', 'email', 'id', 'department', 'salary']);
    });

    it('should move column backward', () => {
      mockSpecManager.spec.state.columnOrder = ['id', 'name', 'email', 'department', 'salary'];
      
      // Move 'salary' (index 4) to position 1
      const currentOrder = mockSpecManager.spec.state.columnOrder;
      const fromIndex = 4;
      const toIndex = 1;
      const newOrder = [...currentOrder];
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, currentOrder[fromIndex]);
      
      columnReorder.setColumnOrder(newOrder);
      
      expect(mockSpecManager.spec.state.columnOrder).toEqual(['id', 'salary', 'name', 'email', 'department']);
    });
  });

  describe('getVisibleColumns', () => {
    it('should return all columns when visibleColumns is empty', () => {
      const visible = columnReorder.getVisibleColumns();
      
      expect(visible).toEqual(['id', 'name', 'email', 'department', 'salary']);
    });

    it('should return only visible columns in order', () => {
      mockSpecManager.spec.state.visibleColumns = ['name', 'salary', 'email'];
      mockSpecManager.spec.state.columnOrder = ['salary', 'email', 'name', 'id', 'department'];
      
      const visible = columnReorder.getVisibleColumns();
      
      // Should be ordered: salary, email, name (following columnOrder)
      expect(visible).toEqual(['salary', 'email', 'name']);
    });

    it('should handle custom column order', () => {
      mockSpecManager.spec.state.columnOrder = ['salary', 'name', 'id'];
      mockSpecManager.spec.state.visibleColumns = ['id', 'name', 'salary'];
      
      const visible = columnReorder.getVisibleColumns();
      
      expect(visible).toEqual(['salary', 'name', 'id']);
    });
  });

  describe('resetOrder', () => {
    it('should clear column order', () => {
      mockSpecManager.spec.state.columnOrder = ['salary', 'name', 'id'];
      
      columnReorder.resetOrder();
      
      expect(mockSpecManager.spec.state.columnOrder).toEqual([]);
    });

    it('should revert to schema order after reset', () => {
      mockSpecManager.spec.state.columnOrder = ['salary', 'name', 'id'];
      
      columnReorder.resetOrder();
      
      const order = columnReorder.getColumnOrder();
      expect(order).toEqual(['id', 'name', 'email', 'department', 'salary']);
    });
  });

  describe('drag and drop handlers', () => {
    it('should handle drag start', () => {
      const mockEvent = {
        dataTransfer: {
          effectAllowed: '',
          setData: function(type, data) {
            this._data = { type, data };
          }
        },
        target: { style: { opacity: '1' } }
      };

      columnReorder.onDragStart('name', mockEvent);

      expect(columnReorder.draggedColumn).toBe('name');
      expect(mockEvent.dataTransfer.effectAllowed).toBe('move');
      expect(mockEvent.target.style.opacity).toBe('0.5');
    });

    it('should handle drag over', () => {
      const mockEvent = {
        preventDefault: function() { this._prevented = true; },
        dataTransfer: { dropEffect: '' }
      };

      columnReorder.onDragOver('email', mockEvent);

      expect(mockEvent._prevented).toBe(true);
      expect(mockEvent.dataTransfer.dropEffect).toBe('move');
      expect(columnReorder.dragOverColumn).toBe('email');
    });

    it('should handle drop and reorder', () => {
      columnReorder.draggedColumn = 'id';
      
      const mockEvent = {
        preventDefault: function() { this._prevented = true; }
      };

      const currentOrder = ['id', 'name', 'email', 'department', 'salary'];
      mockSpecManager.spec.state.columnOrder = currentOrder;

      columnReorder.onDrop('email', mockEvent);

      expect(mockEvent._prevented).toBe(true);
      // 'id' should be moved to position of 'email'
      expect(mockSpecManager.spec.state.columnOrder).toEqual(['name', 'email', 'id', 'department', 'salary']);
    });

    it('should not reorder if dropping on same column', () => {
      columnReorder.draggedColumn = 'name';
      
      const mockEvent = {
        preventDefault: function() {}
      };

      const originalOrder = ['id', 'name', 'email', 'department', 'salary'];
      mockSpecManager.spec.state.columnOrder = [...originalOrder];

      columnReorder.onDrop('name', mockEvent);

      expect(mockSpecManager.spec.state.columnOrder).toEqual(originalOrder);
    });

    it('should handle drag end', () => {
      columnReorder.draggedColumn = 'name';
      columnReorder.dragOverColumn = 'email';
      
      const mockEvent = {
        target: { style: { opacity: '0.5' } }
      };

      columnReorder.onDragEnd(mockEvent);

      expect(mockEvent.target.style.opacity).toBe('');
      expect(columnReorder.draggedColumn).toBeNull();
      expect(columnReorder.dragOverColumn).toBeNull();
    });
  });
});
