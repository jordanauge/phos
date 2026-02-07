import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import GridView from '../../src/components/views/GridView';

describe('GridView - read-only columns', () => {
  it('should not open the editor for read-only columns', () => {
    const spec = {
      metadata: { columns: { name: { readOnly: true } } },
      state: {
        visibleColumns: ['name'],
        columnOrder: [],
        sort: []
      }
    };
    const schema = { columns: [{ name: 'name', type: 'string' }] };
    const result = { data: [{ name: 'Alice' }], totalCount: 1 };
    const specManager = { setSort: () => {}, notifyListeners: () => {} };

    render(
      React.createElement(GridView, {
        result,
        spec,
        schema,
        specManager,
        heuristics: {}
      })
    );

    const cell = screen.getByText('Alice').closest('td');
    fireEvent.doubleClick(cell);

    expect(document.querySelector('.cell-editor-overlay')).toBeNull();
  });
});

describe('GridView - header sorting', () => {
  it('should set single sort on header click', () => {
    const spec = {
      metadata: { columns: {} },
      state: {
        visibleColumns: ['name'],
        columnOrder: [],
        sort: []
      }
    };
    const schema = { columns: [{ name: 'name', type: 'string' }] };
    const result = { data: [{ name: 'Alice' }], totalCount: 1 };
    const specManager = { setSort: vi.fn(), notifyListeners: () => {} };

    render(
      React.createElement(GridView, {
        result,
        spec,
        schema,
        specManager,
        heuristics: {}
      })
    );

    fireEvent.click(screen.getByText('name'));
    expect(specManager.setSort).toHaveBeenCalledWith({ column: 'name', direction: 'asc' });
  });

  it('should add multi-sort on shift click', () => {
    const spec = {
      metadata: { columns: {} },
      state: {
        visibleColumns: ['name', 'dept'],
        columnOrder: [],
        sort: [{ column: 'name', direction: 'asc' }]
      }
    };
    const schema = { columns: [{ name: 'name', type: 'string' }, { name: 'dept', type: 'string' }] };
    const result = { data: [{ name: 'Alice', dept: 'Eng' }], totalCount: 1 };
    const specManager = { setSort: vi.fn(), notifyListeners: () => {} };

    render(
      React.createElement(GridView, {
        result,
        spec,
        schema,
        specManager,
        heuristics: {}
      })
    );

    fireEvent.click(screen.getByText('dept'), { shiftKey: true });
    expect(specManager.setSort).toHaveBeenCalledWith([
      { column: 'name', direction: 'asc' },
      { column: 'dept', direction: 'asc' }
    ]);
  });
});