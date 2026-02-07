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

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import InfoTooltip from '../InfoTooltip';
import CellEditor from '../CellEditor';
import MetricDetailModal from '../MetricDetailModal'; // Import the new modal
import './GridView.css';

function GridView({ result, spec, schema, specManager, heuristics }) {
  const [editingCell, setEditingCell] = useState(null);
  const [detailRow, setDetailRow] = useState(null); // State for detail modal
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [cellContextMenu, setCellContextMenu] = useState(null);
  const [rowContextMenu, setRowContextMenu] = useState(null);
  const canEditData = typeof specManager?.supportsDataMutations === 'function'
    ? specManager.supportsDataMutations()
    : false;

  // Row context menu triggers are configurable in settings.
  const rowMenuTriggers = spec.settings?.ui?.rowContextMenuTriggers || {
    handle: true,
    shift: false,
    alt: false,
    replaceCell: false
  };
  const showRowHandle = !!rowMenuTriggers.handle;

  const visibleCols = spec.state.visibleColumns.length > 0
    ? spec.state.visibleColumns
    : schema.columns.map(c => c.name);

  // Respect column order from spec if provided.
  const orderedVisibleCols = (spec.state.columnOrder || []).length > 0
    ? spec.state.columnOrder.filter(col => visibleCols.includes(col))
    : visibleCols;

  const handleSort = (column, isMulti) => {
    const currentSorts = spec.state.sort || [];
    const existingIndex = currentSorts.findIndex(s => s.column === column);
    const nextDirection = existingIndex >= 0 && currentSorts[existingIndex].direction === 'asc'
      ? 'desc'
      : 'asc';

    if (isMulti) {
      const nextSorts = [...currentSorts];
      if (existingIndex >= 0) {
        nextSorts[existingIndex] = { column, direction: nextDirection };
      } else {
        nextSorts.push({ column, direction: 'asc' });
      }
      specManager.setSort(nextSorts);
      return;
    }

    specManager.setSort({ column, direction: nextDirection });
  };

  const getSortIndicator = (column) => {
    const currentSorts = spec.state.sort || [];
    const sortIndex = currentSorts.findIndex(s => s.column === column);
    if (sortIndex === -1) {
      return null;
    }
    const sort = currentSorts[sortIndex];
    return {
      arrow: sort.direction === 'asc' ? '▲' : '▼',
      rank: sortIndex + 1
    };
  };

  const getCurrentOrder = () => {
    if (spec.state.columnOrder && spec.state.columnOrder.length > 0) {
      return spec.state.columnOrder;
    }
    return schema.columns.map(c => c.name);
  };

  const handleHeaderDragStart = (column, event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', column);
  };

  const handleHeaderDragOver = (column, event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverColumn(column);
  };

  const handleHeaderDrop = (targetColumn, event) => {
    event.preventDefault();
    const draggedColumn = event.dataTransfer.getData('text/plain');
    setDragOverColumn(null);

    if (!draggedColumn || draggedColumn === targetColumn) {
      return;
    }

    const currentOrder = getCurrentOrder();
    const fromIndex = currentOrder.indexOf(draggedColumn);
    const toIndex = currentOrder.indexOf(targetColumn);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedColumn);
    specManager.updateState({ columnOrder: newOrder });
  };

  const handleHeaderContextMenu = (column, event) => {
    event.preventDefault();
    setCellContextMenu(null);
    setRowContextMenu(null);
    setContextMenu({
      column,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleCellContextMenu = (rowIndex, column, value, event) => {
    event.preventDefault();
    const row = result.data[rowIndex];
    const rowId = row?.__rowid;
    const useRowMenu = rowMenuTriggers.replaceCell
      || (rowMenuTriggers.shift && event.shiftKey)
      || (rowMenuTriggers.alt && event.altKey);

    if (useRowMenu) {
      handleRowContextMenu(rowIndex, rowId, event);
      return;
    }

    setContextMenu(null);
    setRowContextMenu(null);
    setCellContextMenu({
      rowIndex,
      column,
      value,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleRowContextMenu = (rowIndex, rowId, event) => {
    event.preventDefault();
    setContextMenu(null);
    setCellContextMenu(null);
    setRowContextMenu({
      rowIndex,
      rowId,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleHideColumn = (column) => {
    const current = spec.state.visibleColumns.length > 0
      ? spec.state.visibleColumns
      : schema.columns.map(c => c.name);
    specManager.setVisibleColumns(current.filter(col => col !== column));
    setContextMenu(null);
  };

  const handleShowAllColumns = () => {
    specManager.setVisibleColumns([]);
    setContextMenu(null);
  };

  const handleClearColumnSort = (column) => {
    const nextSorts = (spec.state.sort || []).filter(s => s.column !== column);
    specManager.setSort(nextSorts);
    setContextMenu(null);
  };

  const handleOpenTarget = (colName, value) => {
     // Heuristic: Assume value is a "Name"
     // We want to find the row where Name == value and open details
     // Or filter. User said "Set Key Filter".
     
     // Let's implement "Set Key Filter" which clears other filters and sets Name = value
     specManager.updateState({
       filters: [{
         column: 'Name', // Hardcoded heuristic for now based on user request "HyperLink(Name)"
         operator: '=',
         value: value,
         enabled: true
       }]
     });
     setCellContextMenu(null);
  };

  const handleCopyCell = (value) => {
    if (value !== null && value !== undefined) {
      navigator.clipboard.writeText(String(value));
    }
    setCellContextMenu(null);
  };

  const handleFilterByValue = (column, value) => {
    specManager.addFilter({
      column,
      operator: '=',
      value,
      enabled: true
    });
    setCellContextMenu(null);
  };

  const handleFilterOutValue = (column, value) => {
    specManager.addFilter({
      column,
      operator: '!=',
      value,
      enabled: true
    });
    setCellContextMenu(null);
  };

  const handleDeleteRow = async (rowId) => {
    try {
      await specManager.deleteRow(rowId);
    } catch (err) {
      alert(err.message || 'Failed to delete row.');
    }
    setRowContextMenu(null);
  };

  const handleDuplicateRow = async (rowId) => {
    try {
      await specManager.duplicateRow(rowId);
    } catch (err) {
      alert(err.message || 'Failed to duplicate row.');
    }
    setRowContextMenu(null);
  };

  const handleEditMetadata = (column, updates) => {
    const nextMetadata = {
      ...(spec.metadata || {}),
      columns: {
        ...(spec.metadata?.columns || {}),
        [column]: {
          ...(spec.metadata?.columns?.[column] || {}),
          ...updates
        }
      }
    };
    specManager.updateSpec({ metadata: nextMetadata });
  };

  const handleAddColumn = async () => {
    const name = prompt("Enter new column name:");
    if (name) {
      try {
        await specManager.addColumn(name, "");
      } catch (e) {
        alert(e.message);
      }
    }
    setContextMenu(null);
  }

  // Infer enum options from metadata or a small set of distinct values.
  const getEnumOptions = (colName) => {
    const metadataEnum = spec.metadata?.columns?.[colName]?.enum;
    if (Array.isArray(metadataEnum) && metadataEnum.length > 0) {
      return metadataEnum;
    }

    if (heuristics?.enumInference === false) {
      return null;
    }

    const values = result.data
      .map(row => row[colName])
      .filter(value => value !== null && value !== undefined && value !== '' && !Array.isArray(value));

    const uniqueValues = Array.from(new Set(values));
    const isPrimitiveEnum = uniqueValues.every(value => {
      const valueType = typeof value;
      return valueType === 'string' || valueType === 'number' || valueType === 'boolean';
    });

    if (uniqueValues.length >= 2 && uniqueValues.length <= 20 && isPrimitiveEnum) {
      return uniqueValues;
    }

    return null;
  };

  const handleCellDoubleClick = (rowIndex, colName) => {
    // Check both column-level and global read-only settings
    const isColumnReadOnly = !!spec.metadata?.columns?.[colName]?.readOnly;
    const isGlobalReadOnly = !!spec.settings?.readOnly;
    
    // If read-only OR row-handle was clicked (not applicable here but for concept)
    // Actually, if user wants "Metric line" double click, we should probably prefer Opening Details
    // if it's NOT explicitly an editable field, OR if we decide double-click always opens details
    // and we need another way to edit (e.g. Right Click -> Edit).
    // BUT the user said "double clicking a metric line should open a model".
    // Let's make it so if we click a non-editable cell, it opens details.
    // AND if we click the row handle, it opens details.
    
    // For now: Keep simple edit on double click for editable cells.
    // If ReadOnly or Not Editable -> Open Details.
    
    if (isColumnReadOnly || isGlobalReadOnly || !canEditData) {
       setDetailRow(result.data[rowIndex]);
       return;
    }
    
    // Check if it's a long text field -> Prefer details view?
    // Or just let user edit.
    
    const enumOptions = getEnumOptions(colName);
    const editorType = enumOptions ? 'select' : getCellEditorType(colName);
    setEditingCell({ rowIndex, colName, enumOptions, editorType });
  };
  
  const handleOpenDetails = (rowIndex) => {
     setDetailRow(result.data[rowIndex]);
     setRowContextMenu(null);
     setCellContextMenu(null);
  };

  const handleSaveCell = async (newValue) => {
    if (editingCell) {
      const row = result.data[editingCell.rowIndex];
      const rowId = row?.__rowid;
      try {
        await specManager.updateCell(rowId, editingCell.colName, newValue);
      } catch (err) {
        alert(err.message || 'Failed to update cell.');
      }
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const getCellEditorType = (colName) => {
    if (colName === 'Description') return 'textarea';
    return 'text';
  };

  // Render value with optional formatting and enum info tooltip.
  const renderCellContent = (colName, value, rowIndex) => {
    const metadata = spec.metadata?.columns?.[colName];
    const format = metadata?.format;
    const enumDocs = metadata?.enumDocs;
    const colType = schema.types?.[colName];
    const isReadOnly = !!metadata?.readOnly;
    
    // Handle boolean values with toggle
    if (colType === 'boolean') {
      const boolValue = value === true || value === 'true' || value === 1;
      return (
        <button
          className={`bool-toggle ${boolValue ? 'bool-toggle-on' : 'bool-toggle-off'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isReadOnly && canEditData) {
              const row = result.data[rowIndex];
              const rowId = row.__rowid;
              specManager.updateCell(rowId, colName, !boolValue);
            }
          }}
          disabled={isReadOnly || !canEditData}
          title={isReadOnly ? 'Read-only' : 'Click to toggle'}
        >
          {boolValue ? '✓' : '✗'}
        </button>
      );
    }
    
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    const displayText = displayValue == null ? '' : String(displayValue);
    const infoText = enumDocs?.[displayText];

    if (format?.type === 'badge') {
      const className = format.classMap?.[displayText] || '';
      const iconClass = format.iconMap?.[displayText];
      return (
        <span className={`cell-badge ${className}`.trim()}>
          {iconClass && <i className={iconClass} aria-hidden="true" />}
          {displayText}
          {infoText && <span className="enum-info-icon" title={infoText}>ⓘ</span>}
        </span>
      );
    }

    if (format?.type === 'text' || format?.fontWeight) {
      if (format.type === 'link') {
         // Render link-like
      }
      return (
        <span className="cell-value" style={{ fontWeight: format?.fontWeight || 'inherit' }}>
          {displayText}
          {infoText && <span className="enum-info-icon" title={infoText}>ⓘ</span>}
        </span>
      );
    }

    return (
      <span className="cell-value">
        {displayText}
        {infoText && <span className="enum-info-icon" title={infoText}>ⓘ</span>}
      </span>
    );
  };

  useEffect(() => {
    // Close any open context menus when clicking elsewhere or pressing Escape.
    const handleCloseMenu = () => {
      setContextMenu(null);
      setCellContextMenu(null);
      setRowContextMenu(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
        setCellContextMenu(null);
        setRowContextMenu(null);
      }
    };

    if (contextMenu || cellContextMenu || rowContextMenu) {
      document.addEventListener('click', handleCloseMenu);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleCloseMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, cellContextMenu, rowContextMenu]);

  return (
    <div className="grid-view">
      <table>
        <thead>
          <tr>
            {showRowHandle && <th className="row-handle-header">#</th>}
            {orderedVisibleCols.map(col => {
              const metadata = spec.metadata?.columns?.[col];
              const sortIndicator = getSortIndicator(col);
              return (
                <th
                  key={col}
                  draggable
                  onDragStart={(event) => handleHeaderDragStart(col, event)}
                  onDragOver={(event) => handleHeaderDragOver(col, event)}
                  onDrop={(event) => handleHeaderDrop(col, event)}
                  onContextMenu={(event) => handleHeaderContextMenu(col, event)}
                  className={dragOverColumn === col ? 'th-drag-over' : ''}
                >
                  <div className="th-content">
                    <button
                      type="button"
                      className="th-sort-button"
                      onClick={(event) => handleSort(col, event.shiftKey)}
                      title="Click to sort, Shift+Click to multi-sort"
                    >
                      <span>{col}</span>
                      {sortIndicator && (
                        <span className="th-sort-indicator">
                          <span className="th-sort-arrow">{sortIndicator.arrow}</span>
                          {spec.state.sort.length > 1 && (
                            <span className="th-sort-rank">{sortIndicator.rank}</span>
                          )}
                        </span>
                      )}
                    </button>
                    <InfoTooltip
                      column={col}
                      metadata={metadata}
                      onEdit={handleEditMetadata}
                    />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {result.data.map((row, idx) => (
            <tr key={idx}>
              {showRowHandle && (
                <td
                  className="row-handle-cell"
                  onContextMenu={(event) => handleRowContextMenu(idx, row?.__rowid, event)}
                  title="Right-click for row actions"
                >
                  {idx + 1}
                </td>
              )}
              {orderedVisibleCols.map(col => {
                const isReadOnly = !!spec.metadata?.columns?.[col]?.readOnly;
                return (
                  <td
                    key={col}
                    onDoubleClick={() => handleCellDoubleClick(idx, col)}
                    onContextMenu={(event) => handleCellContextMenu(idx, col, row[col], event)}
                    className={isReadOnly ? 'read-only-cell' : 'editable-cell'}
                    title={isReadOnly ? 'Read-only column' : 'Double-click to edit, right-click for options'}
                  >
                    {renderCellContent(col, row[col], idx)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {detailRow && (
        <MetricDetailModal 
           row={detailRow} 
           schema={schema} 
           onClose={() => setDetailRow(null)} 
        />
      )}

      {editingCell && (
        <CellEditor
          value={result.data[editingCell.rowIndex][editingCell.colName]}
          onSave={handleSaveCell}
          onCancel={handleCancelEdit}
          type={editingCell.editorType || getCellEditorType(editingCell.colName)}
          options={editingCell.enumOptions}
        />
      )}

      {contextMenu && (
        <div
          className="header-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => handleHideColumn(contextMenu.column)}>Hide column</button>
          <button onClick={handleShowAllColumns}>Show all columns</button>
          <button onClick={() => handleClearColumnSort(contextMenu.column)}>Clear sort</button>
          <hr />
          <button onClick={handleAddColumn}>Add new column...</button>
        </div>
      )}

      {cellContextMenu && (
        <div
          className="cell-context-menu"
          style={{ top: cellContextMenu.y, left: cellContextMenu.x }}
        >
          <button onClick={() => handleCopyCell(cellContextMenu.value)}>📋 Copy value</button>
          <button onClick={() => handleFilterByValue(cellContextMenu.column, cellContextMenu.value)}>
            🔍 Filter by "{String(cellContextMenu.value).substring(0, 20)}"
          </button>
          <button onClick={() => handleFilterOutValue(cellContextMenu.column, cellContextMenu.value)}>
            🚫 Filter out "{String(cellContextMenu.value).substring(0, 20)}"
          </button>
          
          {/* Heuristic for Links: If col name ends in 'Metric' or 'Target' and value is string */}
          {(cellContextMenu.column.endsWith('Metric') || cellContextMenu.column.endsWith('Target')) && typeof cellContextMenu.value === 'string' && (
             <>
               <hr style={{margin: '4px 0', border: 0, borderTop: '1px solid #eee'}}/>
               <button onClick={() => handleOpenTarget(cellContextMenu.column, cellContextMenu.value)}>
                 🔗 Go to {cellContextMenu.value}
               </button>
             </>
          )}

          <button
            onClick={() => {
              handleCellDoubleClick(cellContextMenu.rowIndex, cellContextMenu.column);
              setCellContextMenu(null);
            }} // Double click logic now handles read-only checks
            disabled={!canEditData || !!spec.settings?.readOnly}
            className={(!canEditData || !!spec.settings?.readOnly) ? 'context-menu-item-disabled' : ''}
            title={(!canEditData || !!spec.settings?.readOnly) ? 'Editing is not supported' : 'Edit this cell'}
          >
            ✏️ Edit
          </button>
        </div>
      )}

      {rowContextMenu && (
        <div
          className="row-context-menu"
          style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
        >
          <button
            onClick={() => handleDuplicateRow(rowContextMenu.rowId)}
            disabled={!canEditData || !!spec.settings?.readOnly || rowContextMenu.rowId == null}
            className={(!canEditData || !!spec.settings?.readOnly || rowContextMenu.rowId == null) ? 'context-menu-item-disabled' : ''}
            title={(!canEditData || !!spec.settings?.readOnly) ? 'Editing is not supported' : 'Duplicate this row'}
          >
            📑 Duplicate row
          </button>
          <button
            onClick={() => handleDeleteRow(rowContextMenu.rowId)}
            disabled={!canEditData || !!spec.settings?.readOnly || rowContextMenu.rowId == null}
            className={(!canEditData || !!spec.settings?.readOnly || rowContextMenu.rowId == null) ? 'context-menu-item-disabled' : ''}
            title={(!canEditData || !!spec.settings?.readOnly) ? 'Editing is not supported' : 'Delete this row'}
          >
            🗑️ Delete row
          </button>
        </div>
      )}
    </div>
  );
}

GridView.propTypes = {
  result: PropTypes.shape({
    data: PropTypes.array.isRequired,
    totalCount: PropTypes.number
  }).isRequired,
  spec: PropTypes.shape({
    state: PropTypes.object.isRequired,
    settings: PropTypes.object,
    metadata: PropTypes.object,
    visualizations: PropTypes.array
  }).isRequired,
  schema: PropTypes.shape({
    columns: PropTypes.array.isRequired
  }).isRequired,
  specManager: PropTypes.shape({
    setSort: PropTypes.func,
    updateState: PropTypes.func,
    setVisibleColumns: PropTypes.func,
    addFilter: PropTypes.func,
    updateSpec: PropTypes.func,
    notifyListeners: PropTypes.func,
    supportsDataMutations: PropTypes.func,
    updateCell: PropTypes.func,
    deleteRow: PropTypes.func,
    duplicateRow: PropTypes.func
  }).isRequired,
  heuristics: PropTypes.object
};

export default GridView;
