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

import React from 'react';
import './MultiLevelSort.css';

function MultiLevelSort({ schema, specManager, spec }) {
  const sortLevels = spec.state.sort || [];

  const handleAddSortLevel = () => {
    const availableColumns = schema.columns.filter(
      c => !sortLevels.some(s => s.column === c.name)
    );
    if (availableColumns.length === 0) return;

    specManager.addSortLevel({
      column: availableColumns[0].name,
      direction: 'ASC'
    });
  };

  const handleChangeSortColumn = (index, newColumn) => {
    const newSortLevels = [...sortLevels];
    newSortLevels[index] = { ...newSortLevels[index], column: newColumn };
    specManager.setSort(newSortLevels);
  };

  const handleChangeSortDirection = (index, newDirection) => {
    const newSortLevels = [...sortLevels];
    newSortLevels[index] = { ...newSortLevels[index], direction: newDirection };
    specManager.setSort(newSortLevels);
  };

  const handleRemoveSort = (index) => {
    const newSortLevels = sortLevels.filter((_, i) => i !== index);
    specManager.setSort(newSortLevels);
  };

  const availableColumns = schema.columns.filter(
    c => !sortLevels.some(s => s.column === c.name)
  );

  if (sortLevels.length === 0) {
    return (
      <button onClick={handleAddSortLevel} className="toolbar-btn" disabled={availableColumns.length === 0}>
        + Add Sort Level
      </button>
    );
  }

  return (
    <div className="multi-level-sort-inline">
      {sortLevels.map((sortItem, index) => (
        <div key={index} className="sort-level-inline">
          <select
            value={sortItem.column}
            onChange={(e) => handleChangeSortColumn(index, e.target.value)}
            className="sort-select-compact"
          >
            {schema.columns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
          <button
            onClick={() => handleChangeSortDirection(index, sortItem.direction === 'ASC' ? 'DESC' : 'ASC')}
            className="sort-toggle-btn"
            title={`Currently: ${sortItem.direction}`}
          >
            {sortItem.direction === 'ASC' ? '↑' : '↓'}
          </button>
          <button
            onClick={() => handleRemoveSort(index)}
            className="sort-remove-btn"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      {availableColumns.length > 0 && (
        <button onClick={handleAddSortLevel} className="toolbar-btn" style={{ marginLeft: '8px' }}>
          +
        </button>
      )}
    </div>
  );
}

export default MultiLevelSort;
