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

import React, { useState } from 'react';
import './CellEditor.css';

function CellEditor({ value, onSave, onCancel, type = 'text', options = null, allowCustom = true }) {
  const initialValue = value == null ? '' : value;
  const [editValue, setEditValue] = useState(initialValue);
  const [isCustom, setIsCustom] = useState(
    type === 'select' && Array.isArray(options) && options.length > 0 && !options.includes(initialValue)
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSelectChange = (e) => {
    const nextValue = e.target.value;
    if (nextValue === '__custom__') {
      setIsCustom(true);
      return;
    }
    setIsCustom(false);
    setEditValue(nextValue);
  };

  return (
    <div className="cell-editor-overlay" onClick={onCancel}>
      <div className="cell-editor" onClick={(e) => e.stopPropagation()}>
        {type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={4}
            className="cell-editor-textarea"
          />
        ) : type === 'select' && Array.isArray(options) ? (
          <div className="cell-editor-select">
            {!isCustom && (
              <select
                value={options.includes(editValue) ? editValue : ''}
                onChange={handleSelectChange}
                autoFocus
                className="cell-editor-input"
              >
                <option value="" disabled>
                  Select...
                </option>
                {options.map(option => (
                  <option key={String(option)} value={option}>
                    {String(option)}
                  </option>
                ))}
                {allowCustom && <option value="__custom__">Custom...</option>}
              </select>
            )}
            {isCustom && (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="cell-editor-input"
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="cell-editor-input"
          />
        )}
        <div className="cell-editor-actions">
          <button onClick={() => onSave(editValue)} className="cell-editor-btn save">
            Save
          </button>
          <button onClick={onCancel} className="cell-editor-btn cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CellEditor;
