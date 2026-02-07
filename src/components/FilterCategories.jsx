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
import InfoTooltip from './InfoTooltip';
import './FilterCategories.css';

function FilterCategories({ schema, provider, specManager, spec, uniqueValues }) {
  // Initialize collapsed state from spec
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const collapsedFilters = spec.state.collapsedFilters || [];
    return new Set(collapsedFilters);
  });
  
  const [contextMenu, setContextMenu] = useState(null);

  // No automatic categorization - each attribute is its own category

  // Check if column represents a set (from metadata or by detecting comma-separated values)
  const isSetAttribute = (colName) => {
    // Check metadata first
    const metadata = spec.metadata?.columns?.[colName];
    if (metadata?.isSet) return true;
    
    // Check if any actual row data has array values
    // (uniqueValues are already flattened, so we need to check raw data)
    // For now, rely on metadata marking
    return false;
  };

  const hiddenFilters = spec.state.hiddenFilters || [];
  
  // Each column is its own category
  // Filter out columns with all empty values
  const filterableColumns = schema.columns.filter(col => {
    if (hiddenFilters.includes(col.name)) return false;
    
    const values = uniqueValues.get(col.name) || [];
    // Filter out if only empty/null values
    const nonEmptyValues = values.filter(v => v !== null && v !== '' && v !== 'null');
    return nonEmptyValues.length > 0;
  });

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      
      // Update spec with new collapsed state
      spec.state.collapsedFilters = Array.from(next);
      specManager.notifyListeners();
      
      return next;
    });
  };

  const updateHiddenFilters = (nextHidden) => {
    spec.state.hiddenFilters = nextHidden;
    specManager.notifyListeners();
  };

  const updateCollapsedFilters = (nextCollapsed) => {
    spec.state.collapsedFilters = Array.from(nextCollapsed);
    specManager.notifyListeners();
  };

  const handleHeaderContextMenu = (column, isCollapsed, event) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      type: 'header',
      column,
      isCollapsed,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleValueContextMenu = (column, value, event) => {
    event.preventDefault();
    setContextMenu({
      type: 'value',
      column,
      value,
      x: event.clientX,
      y: event.clientY
    });
  };

  const addFilterValue = (column, operator, value, replace = false) => {
    if (replace) {
      spec.state.filters = spec.state.filters.filter(f => f.column !== column);
    }

    const exists = spec.state.filters.some(
      f => f.column === column && f.operator === operator && f.value === value
    );
    if (!exists) {
      specManager.addFilter({
        column,
        operator,
        value,
        enabled: true,
        mode: getFilterMode(column)
      });
    } else {
      specManager.notifyListeners();
    }
  };

  const clearColumnFilters = (column) => {
    spec.state.filters = spec.state.filters.filter(f => f.column !== column);
    specManager.notifyListeners();
  };

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('click', handleClose);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('click', handleClose);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const getSelectedValues = (column) => {
    const filters = spec.state.filters.filter(f => f.column === column);
    return filters.map(f => f.value);
  };

  const getFilterMode = (column) => {
    const filter = spec.state.filters.find(f => f.column === column);
    return filter?.mode || 'ANY';
  };

  const handleCheckboxChange = (column, value, checked) => {
    const currentFilters = spec.state.filters.filter(f => f.column === column);
    
    if (checked) {
      // Add filter
      specManager.addFilter({
        column,
        operator: '=',
        value,
        enabled: true,
        mode: getFilterMode(column)
      });
    } else {
      // Remove specific filter
      const filterIndex = spec.state.filters.findIndex(
        f => f.column === column && f.value === value
      );
      if (filterIndex >= 0) {
        spec.state.filters.splice(filterIndex, 1);
        specManager.notifyListeners();
      }
    }
  };

  const handleSelectAll = (column, values) => {
    // Clear existing filters for this column
    spec.state.filters = spec.state.filters.filter(f => f.column !== column);
    
    // Add all values
    values.forEach(value => {
      specManager.addFilter({
        column,
        operator: '=',
        value,
        enabled: true,
        mode: getFilterMode(column)
      });
    });
  };

  const handleSelectNone = (column) => {
    spec.state.filters = spec.state.filters.filter(f => f.column !== column);
    specManager.notifyListeners();
  };

  const toggleFilterMode = (column) => {
    const filters = spec.state.filters.filter(f => f.column === column);
    const currentMode = filters[0]?.mode || 'ANY';
    const newMode = currentMode === 'ANY' ? 'ALL' : 'ANY';
    
    filters.forEach(f => {
      f.mode = newMode;
    });
    specManager.notifyListeners();
  };

  const handleEditMetadata = (column, updates) => {
    // Update spec metadata
    if (!spec.metadata) spec.metadata = {};
    if (!spec.metadata.columns) spec.metadata.columns = {};
    if (!spec.metadata.columns[column]) spec.metadata.columns[column] = {};

    const nextMetadata = {
      ...spec.metadata.columns[column],
      ...updates
    };
    spec.metadata.columns[column] = nextMetadata;
    specManager.notifyListeners();
  };

  return (
    <div className="filter-categories">
      {filterableColumns.map(col => {
        const isCollapsed = collapsedCategories.has(col.name);
        const allValues = uniqueValues.get(col.name) || [];
        // Filter out empty/null values
        const values = allValues.filter(v => v !== null && v !== '' && v !== 'null');
        const selectedValues = getSelectedValues(col.name);
        const isSet = isSetAttribute(col.name);
        const filterMode = getFilterMode(col.name);
        const metadata = spec.metadata?.columns?.[col.name];
        const selectedCount = selectedValues.length;
        const totalCount = values.length;
        
        return (
          <div key={col.name} className={`filter-category ${isCollapsed ? 'collapsed' : ''}`}>
            <div
              className="filter-category-header"
              onClick={() => toggleCategory(col.name)}
              onContextMenu={(event) => handleHeaderContextMenu(col.name, isCollapsed, event)}
            >
              <div className="header-left">
                <span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
                <span className="category-name">{col.name}</span>
                <InfoTooltip 
                  column={col.name} 
                  metadata={metadata}
                  onEdit={handleEditMetadata}
                />
              </div>
              <div className="header-right">
                {selectedCount > 0 && (
                  <span className="filter-count">{selectedCount}/{totalCount}</span>
                )}
                <button 
                  className="select-btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleSelectAll(col.name, values.slice(0, 50)); }}
                  title="Select all"
                >
                  ✓
                </button>
                <button 
                  className="select-btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleSelectNone(col.name); }}
                  title="Clear selection"
                >
                  ×
                </button>
                {isSet && (
                  <button 
                    className={`mode-toggle-compact ${filterMode.toLowerCase()}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterMode(col.name); }}
                    title={filterMode === 'ANY' ? 'OR mode (match any)' : 'AND mode (match all)'}
                  >
                    {filterMode === 'ANY' ? 'OR' : 'AND'}
                  </button>
                )}
              </div>
            </div>
            
            {!isCollapsed && (
              <div className="filter-category-content">
                <div className="filter-section">
                  <div className="filter-options">
                    {values.slice(0, 50).map(v => (
                      <label
                        key={v}
                        className="checkbox-label"
                        onContextMenu={(event) => handleValueContextMenu(col.name, v, event)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(v)}
                          onChange={(e) => handleCheckboxChange(col.name, v, e.target.checked)}
                        />
                        <span className="checkbox-text">{v}</span>
                      </label>
                    ))}
                    {values.length > 50 && (
                      <div className="more-values">
                        ... {values.length - 50} more values
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {contextMenu && (
        <div
          className="filter-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === 'header' ? (
            <>
              <button onClick={() => {
                const nextHidden = new Set(spec.state.hiddenFilters || []);
                nextHidden.add(contextMenu.column);
                updateHiddenFilters(Array.from(nextHidden));
                setContextMenu(null);
              }}>
                Hide filter
              </button>
              <button onClick={() => { updateHiddenFilters([]); setContextMenu(null); }}>
                Show all filters
              </button>
              <button onClick={() => {
                const next = new Set(collapsedCategories);
                if (contextMenu.isCollapsed) {
                  next.delete(contextMenu.column);
                } else {
                  next.add(contextMenu.column);
                }
                setCollapsedCategories(next);
                updateCollapsedFilters(next);
                setContextMenu(null);
              }}>
                {contextMenu.isCollapsed ? 'Expand filter' : 'Collapse filter'}
              </button>
              <button onClick={() => { clearColumnFilters(contextMenu.column); setContextMenu(null); }}>
                Clear filter
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { addFilterValue(contextMenu.column, '=', contextMenu.value, false); setContextMenu(null); }}>
                Add filter
              </button>
              <button onClick={() => { addFilterValue(contextMenu.column, '=', contextMenu.value, true); setContextMenu(null); }}>
                Filter only this value
              </button>
              <button onClick={() => { addFilterValue(contextMenu.column, '!=', contextMenu.value, false); setContextMenu(null); }}>
                Exclude this value
              </button>
              <button onClick={() => { clearColumnFilters(contextMenu.column); setContextMenu(null); }}>
                Clear column filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterCategories;
