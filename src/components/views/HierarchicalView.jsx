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
import './HierarchicalView.css';

function HierarchicalView({ result, spec, schema, specManager }) {
  const [groupContextMenu, setGroupContextMenu] = useState(null);
  const [cellContextMenu, setCellContextMenu] = useState(null);

  let groupLevels = [];
  if (spec.state.groupLevels?.length) {
    groupLevels = spec.state.groupLevels;
  } else if (spec.state.groupBy) {
    groupLevels = [spec.state.groupBy];
  }

  const visibleCols = spec.state.visibleColumns.length > 0
    ? spec.state.visibleColumns
    : schema.columns.map(c => c.name);

  // Context menus are used for group and cell actions.
  const handleGroupContextMenu = (column, groupName, items, event) => {
    event.preventDefault();
    event.stopPropagation();
    setCellContextMenu(null);
    setGroupContextMenu({
      column,
      groupName,
      itemCount: items.length,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleCellContextMenu = (groupName, rowIndex, column, value, event) => {
    event.preventDefault();
    setGroupContextMenu(null);
    setCellContextMenu({
      groupName,
      rowIndex,
      column,
      value,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleCollapseAll = () => {
    document.querySelectorAll('.tree-node').forEach(el => {
      el.open = false;
    });
    setGroupContextMenu(null);
  };

  const handleExpandAll = () => {
    document.querySelectorAll('.tree-node').forEach(el => {
      el.open = true;
    });
    setGroupContextMenu(null);
  };

  const handleFilterByGroup = (column, groupName) => {
    if (specManager && column) {
      specManager.addFilter({
        column,
        operator: '=',
        value: groupName,
        enabled: true
      });
    }
    setGroupContextMenu(null);
  };

  const handleCopyCell = (value) => {
    if (value !== null && value !== undefined) {
      navigator.clipboard.writeText(String(value));
    }
    setCellContextMenu(null);
  };

  const handleFilterByValue = (column, value) => {
    if (specManager) {
      specManager.addFilter({
        column,
        operator: '=',
        value,
        enabled: true
      });
    }
    setCellContextMenu(null);
  };

  useEffect(() => {
    const handleCloseMenu = () => {
      setGroupContextMenu(null);
      setCellContextMenu(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setGroupContextMenu(null);
        setCellContextMenu(null);
      }
    };

    if (groupContextMenu || cellContextMenu) {
      document.addEventListener('click', handleCloseMenu);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleCloseMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [groupContextMenu, cellContextMenu]);

  if (groupLevels.length === 0) {
    return (
      <div className="empty-state">
        <p>Select a "Group By" column to see hierarchical view</p>
      </div>
    );
  }

  const groupRows = (rows, column) => {
    const grouped = {};
    rows.forEach(row => {
      const key = row[column] ?? 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });
    return grouped;
  };

  const renderCell = (row, column, rowKey) => (
    <td
      key={`${rowKey}-${column}`}
      onContextMenu={(event) => handleCellContextMenu(column, rowKey, column, row[column], event)}
    >
      {row[column]}
    </td>
  );

  const renderRow = (row, rowKey) => (
    <tr key={rowKey}>
      {visibleCols.map(col => renderCell(row, col, rowKey))}
    </tr>
  );

  const renderTable = (items) => (
    <table>
      <thead>
        <tr>
          {visibleCols.map(col => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map(row => {
          const rowKey = row.__rowid
            ?? row.id
            ?? row.Name
            ?? JSON.stringify(row);
          return renderRow(row, rowKey);
        })}
      </tbody>
    </table>
  );

  const renderGroups = (rows, levelIndex, path) => {
    const column = groupLevels[levelIndex];
    const grouped = groupRows(rows, column);
    return Object.entries(grouped).map(([groupName, items]) => {
      const nextPath = `${path}/${column}:${String(groupName)}`;
      return (
        <details key={nextPath} className="tree-node" open>
          <summary onContextMenu={(event) => handleGroupContextMenu(column, groupName, items, event)}>
            {column}: {groupName} ({items.length} items)
          </summary>
          {levelIndex === groupLevels.length - 1
            ? renderTable(items)
            : renderGroups(items, levelIndex + 1, nextPath)}
        </details>
      );
    });
  };

  return (
    <div className="hierarchical-view">
      {renderGroups(result.data, 0, 'root')}

      {groupContextMenu && (
        <div
          className="group-context-menu"
          style={{ top: groupContextMenu.y, left: groupContextMenu.x }}
        >
          <button onClick={() => handleFilterByGroup(groupContextMenu.column, groupContextMenu.groupName)}>
            🔍 Filter by "{groupContextMenu.groupName}"
          </button>
          <button onClick={handleCollapseAll}>➖ Collapse all groups</button>
          <button onClick={handleExpandAll}>➕ Expand all groups</button>
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
        </div>
      )}
    </div>
  );
}

HierarchicalView.propTypes = {
  result: PropTypes.shape({
    data: PropTypes.array.isRequired,
    totalCount: PropTypes.number
  }).isRequired,
  spec: PropTypes.shape({
    state: PropTypes.object.isRequired
  }).isRequired,
  schema: PropTypes.shape({
    columns: PropTypes.array.isRequired
  }).isRequired,
  specManager: PropTypes.shape({
    addFilter: PropTypes.func
  }).isRequired
};

export default HierarchicalView;
