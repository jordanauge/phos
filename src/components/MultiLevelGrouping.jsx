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
import './MultiLevelGrouping.css';

function MultiLevelGrouping({ schema, specManager, spec }) {
  let initialLevels = [];
  if (spec.state.groupLevels?.length) {
    initialLevels = spec.state.groupLevels;
  } else if (spec.state.groupBy) {
    initialLevels = [spec.state.groupBy];
  }

  const [groupLevels, setGroupLevels] = useState(initialLevels);

  useEffect(() => {
    if (spec.state.groupLevels?.length) {
      setGroupLevels(spec.state.groupLevels);
      return;
    }
    if (spec.state.groupBy) {
      setGroupLevels([spec.state.groupBy]);
      return;
    }
    if (groupLevels.length > 0) {
      setGroupLevels([]);
    }
  }, [spec.state.groupBy, spec.state.groupLevels]);

  const handleAddLevel = (column) => {
    if (!groupLevels.includes(column)) {
      const newLevels = [...groupLevels, column];
      setGroupLevels(newLevels);
      specManager.setGroupLevels(newLevels);
      specManager.setActiveView('hierarchical');
    }
  };

  const handleRemoveLevel = (index) => {
    const newLevels = groupLevels.filter((_, i) => i !== index);
    setGroupLevels(newLevels);
    specManager.setGroupLevels(newLevels);
    if (newLevels[0]) {
      specManager.setActiveView('hierarchical');
    }
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newLevels = [...groupLevels];
    [newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]];
    setGroupLevels(newLevels);
    specManager.setGroupLevels(newLevels);
    specManager.setActiveView('hierarchical');
  };

  const handleMoveDown = (index) => {
    if (index === groupLevels.length - 1) return;
    const newLevels = [...groupLevels];
    [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    setGroupLevels(newLevels);
    specManager.setGroupLevels(newLevels);
    specManager.setActiveView('hierarchical');
  };

  const availableColumns = schema.columns.filter(
    col => !groupLevels.includes(col.name)
  );

  return (
    <div className="multi-level-grouping">
      <div className="grouping-header">
        <span className="grouping-label">Group By (Multiple Levels):</span>
      </div>
      
      <div className="group-levels">
        {groupLevels.map((level, index) => (
          <div key={level} className="group-level-item">
            <span className="level-number">L{index + 1}</span>
            <span className="level-name">{level}</span>
            <div className="level-controls">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === groupLevels.length - 1}
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => handleRemoveLevel(index)}
                title="Remove level"
                className="remove-btn"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        
        {availableColumns.length > 0 && (
          <select
            className="add-level-select"
            onChange={(e) => {
              if (e.target.value) {
                handleAddLevel(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
          >
            <option value="">+ Add grouping level...</option>
            {availableColumns.map(col => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default MultiLevelGrouping;

MultiLevelGrouping.propTypes = {
  schema: PropTypes.shape({
    columns: PropTypes.array.isRequired
  }).isRequired,
  spec: PropTypes.shape({
    state: PropTypes.object.isRequired
  }).isRequired,
  specManager: PropTypes.shape({
    setGroupLevels: PropTypes.func,
    setActiveView: PropTypes.func
  }).isRequired
};
