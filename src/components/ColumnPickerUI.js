/*
 * Copyright (c) 2026 Jordan Auge
 *
 * This file is part of PHOS.
 *
 * PHOS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * PHOS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with PHOS.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Column Reorder UI Component
 * Renders draggable column headers
 */

import { ColumnReorder } from './ColumnReorder.js';
import { html } from 'npm:htl';

export function renderColumnPicker(schema, specManager, state) {
  const columnReorder = new ColumnReorder(specManager, schema);
  const orderedColumns = columnReorder.getColumnOrder();
  const visibleColumns = columnReorder.getVisibleColumns();

  function toggleColumn(column, checked) {
    let current = state.spec.state.visibleColumns;
    if (!current.length) {
      current = schema.columns.map(c => c.name);
    }
    
    if (checked) {
      if (!current.includes(column)) {
        specManager.setVisibleColumns([...current, column]);
      }
    } else {
      specManager.setVisibleColumns(current.filter(c => c !== column));
    }
  }

  function handleDragStart(column, event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', column);
    event.target.classList.add('dragging');
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(targetColumn, event) {
    event.preventDefault();
    const draggedColumn = event.dataTransfer.getData('text/plain');
    
    if (draggedColumn && draggedColumn !== targetColumn) {
      const currentOrder = columnReorder.getColumnOrder();
      const fromIndex = currentOrder.indexOf(draggedColumn);
      const toIndex = currentOrder.indexOf(targetColumn);

      if (fromIndex !== -1 && toIndex !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedColumn);
        columnReorder.setColumnOrder(newOrder);
      }
    }
  }

  function handleDragEnd(event) {
    event.target.classList.remove('dragging');
  }

  function resetOrder() {
    columnReorder.resetOrder();
  }

  return html`<div class="column-picker">
    <div class="column-picker-header">
      <label>Columns (drag to reorder)</label>
      <button onclick=${resetOrder} class="reset-order-btn" title="Reset to default order">↺</button>
    </div>
    <div class="column-list">
      ${orderedColumns.map(colName => {
        const col = schema.columns.find(c => c.name === colName);
        if (!col) return '';
        
        const isVisible = visibleColumns.includes(colName);
        
        return html`<div 
          class=${'column-item' + (isVisible ? ' visible' : '')}
          draggable="true"
          ondragstart=${(e) => handleDragStart(colName, e)}
          ondragover=${handleDragOver}
          ondrop=${(e) => handleDrop(colName, e)}
          ondragend=${handleDragEnd}
        >
          <span class="drag-handle">⋮⋮</span>
          <input 
            type="checkbox" 
            id=${'col-' + colName}
            checked=${isVisible}
            onchange=${(e) => toggleColumn(colName, e.target.checked)}
          />
          <label for=${'col-' + colName}>
            ${colName}
            <span class="column-type">(${col.type})</span>
          </label>
        </div>`;
      })}
    </div>
  </div>`;
}
