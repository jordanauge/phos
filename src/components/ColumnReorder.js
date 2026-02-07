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
 * Column Reordering Component
 * 
 * Features:
 * - Drag & drop to reorder columns
 * - Visual feedback during drag
 * - Persist column order in spec
 */

export class ColumnReorder {
  constructor(specManager, schema) {
    this.specManager = specManager;
    this.schema = schema;
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  /**
   * Get current column order from spec or default to schema order
   */
  getColumnOrder() {
    const spec = this.specManager.getSpec();
    if (spec.state.columnOrder && spec.state.columnOrder.length > 0) {
      return spec.state.columnOrder;
    }
    return this.schema.columns.map(c => c.name);
  }

  /**
   * Set new column order
   */
  setColumnOrder(newOrder) {
    this.specManager.updateState({ columnOrder: newOrder });
  }

  /**
   * Handle drag start
   */
  onDragStart(columnName, event) {
    this.draggedColumn = columnName;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnName);
    event.target.style.opacity = '0.5';
  }

  /**
   * Handle drag over
   */
  onDragOver(columnName, event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    this.dragOverColumn = columnName;
  }

  /**
   * Handle drop
   */
  onDrop(targetColumn, event) {
    event.preventDefault();
    
    if (!this.draggedColumn || this.draggedColumn === targetColumn) {
      return;
    }

    const currentOrder = this.getColumnOrder();
    const fromIndex = currentOrder.indexOf(this.draggedColumn);
    const toIndex = currentOrder.indexOf(targetColumn);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    // Reorder array
    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, this.draggedColumn);

    this.setColumnOrder(newOrder);
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  /**
   * Handle drag end
   */
  onDragEnd(event) {
    event.target.style.opacity = '';
    this.draggedColumn = null;
    this.dragOverColumn = null;
  }

  /**
   * Get ordered and visible columns
   */
  getVisibleColumns() {
    const spec = this.specManager.getSpec();
    const visibleCols = spec.state.visibleColumns.length > 0 
      ? spec.state.visibleColumns 
      : this.schema.columns.map(c => c.name);
    
    const order = this.getColumnOrder();
    
    // Sort visible columns by order
    return visibleCols.sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      return aIndex - bIndex;
    });
  }

  /**
   * Reset column order to default
   */
  resetOrder() {
    this.specManager.updateState({ columnOrder: [] });
  }
}
