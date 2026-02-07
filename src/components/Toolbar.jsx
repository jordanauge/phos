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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import MultiLevelGrouping from './MultiLevelGrouping';
import MultiLevelSort from './MultiLevelSort';
import SearchBar from './SearchBar';
import './Toolbar.css';

function Toolbar({
  schema,
  specManager,
  spec,
  data,
  datasets,
  selectedDataset,
  onDatasetChange,
  heuristics,
  onHeuristicsChange,
  pluginSettings,
  onPluginSettingsChange,
  pluginOptions,
  onDataSourceChange,
  layout = 'full',
  inline = false
}) {
  const hiddenColumns = spec?.state?.hiddenColumns || [];
  const visibleColumns = spec?.state?.visibleColumns || [];
  const sortLevels = spec?.state?.sort || [];
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);
  
  const actionsRef = useRef(null);
  const groupMenuRef = useRef(null);
  const showDataset = layout !== 'actions';
  const showSearch = layout !== 'actions';
  const showActionsRow = layout !== 'top';
  const isDirty = specManager?.isDataDirty && specManager.isDataDirty();
  const isReadOnly = !!spec?.settings?.readOnly;

  const hamburgerRef = useRef(null); 
  const allColumns = useMemo(
    () => (schema?.columns || []).map(col => col.name),
    [schema]
  );
  const orderedColumns = useMemo(() => {
    const order = spec?.state?.columnOrder || [];
    if (!order.length) {
      return allColumns;
    }
    const filtered = order.filter(col => allColumns.includes(col));
    const remaining = allColumns.filter(col => !filtered.includes(col));
    return [...filtered, ...remaining];
  }, [allColumns, spec?.state?.columnOrder]);
  const dataSourceSettings = spec?.settings?.dataSource || { mode: 'auto', providerType: '', config: {} };
  const uiSettings = spec?.settings?.ui || {};
  const rowMenuTriggers = uiSettings.rowContextMenuTriggers || {
    handle: true,
    shift: false,
    alt: false,
    replaceCell: false
  };
  const providerOptions = pluginOptions?.providers || [];

  const updateDataSource = (next) => {
    specManager.updateSpec({
      settings: {
        ...(spec?.settings || {}),
        dataSource: next
      }
    });
    if (onDataSourceChange) {
      onDataSourceChange();
    }
  };

  // Update UI settings stored in the spec.
  const updateUiSettings = (nextUi) => {
    specManager.updateSpec({
      settings: {
        ...(spec?.settings || {}),
        ui: nextUi
      }
    });
  };

  const updateRowMenuTrigger = (key, checked) => {
    updateUiSettings({
      ...uiSettings,
      rowContextMenuTriggers: {
        ...rowMenuTriggers,
        [key]: checked
      }
    });
  };

  const handleColumnToggle = (column, checked) => {
    let current = visibleColumns.length > 0 ? visibleColumns : orderedColumns;
    if (checked) {
      if (!current.includes(column)) {
        specManager.setVisibleColumns([...current, column]);
      }
      return;
    }
    specManager.setVisibleColumns(current.filter(value => value !== column));
  };

  const handleColumnDragStart = (column, event) => {
    setDraggedColumn(column);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDrop = (target, event) => {
    event.preventDefault();
    if (!draggedColumn || draggedColumn === target) {
      return;
    }
    const nextOrder = orderedColumns.filter(col => col !== draggedColumn);
    const targetIndex = nextOrder.indexOf(target);
    nextOrder.splice(targetIndex, 0, draggedColumn);
    specManager.updateState({ columnOrder: nextOrder });
    setDraggedColumn(null);
  };

  const handleSaveSpec = () => {
    const json = specManager.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const baseName = selectedDataset?.base || 'spec';
    anchor.href = url;
    anchor.download = `${baseName}.spec.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target)) {
        setShowGroupMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      return;
    }
    const columns = Object.keys(data[0]);
    const csvRows = [columns.join(',')];
    data.forEach(row => {
      const values = columns.map(col => {
        const value = row[col];
        if (value == null) {
          return '';
        }
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      });
      csvRows.push(values.join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const baseName = selectedDataset?.base || 'export';
    anchor.href = url;
    anchor.download = `${baseName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    if (specManager.resetDirty) {
      specManager.resetDirty();
    }
  };

  const handleExportJSON = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const baseName = selectedDataset?.base || 'export';
    anchor.href = url;
    anchor.download = `${baseName}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    if (specManager.resetDirty) {
      specManager.resetDirty();
    }
  };
  
  const handleSaveAll = () => {
      // Trigger both exports
      // Note: Browsers might block multiple downloads. 
      // Ideally we would zip, but without extra libs, separate files is best.
      handleExportJSON();
      setTimeout(handleSaveSpec, 200);
  };

  const handleResetSpec = () => {
    if (confirm('Reset to default spec? This will clear all filters and settings.')) {
      specManager.clearFilters();
      specManager.setGroupBy(null);
      specManager.updateState({
        sort: [],
        visibleColumns: ['Scope', 'Layer', 'Implementation Type', 'Computation Cost', 'Score Type'],
        activeView: 'grid'
      });
    }
  };

  const handleApplyPreset = (preset) => {
    specManager.applyPreset(preset.name);
    setShowPresetModal(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showActions) {
        return;
      }
      const target = event.target;
      if (actionsRef.current?.contains(target) || hamburgerRef.current?.contains(target)) {
        return;
      }
      setShowActions(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showActions]);

  useEffect(() => {
    if (showActionsRow) {
      return;
    }
    setShowActions(false);
    setShowSettings(false);
    setShowPresetModal(false);
  }, [showActionsRow]);

  return (
    <>
      <div className={`toolbar-compact ${inline ? 'toolbar-inline' : ''}`.trim()}>
        <div className="toolbar-row">
          {showDataset && (
            <div className="toolbar-group toolbar-group-left">
              <span className="toolbar-label">Dataset</span>
              <select
                className="toolbar-select"
                value={selectedDataset || ''}
                onChange={(event) => onDatasetChange(event.target.value)}
              >
                {(datasets || []).map(file => (
                  <option key={file.name} value={file.name}>
                    {file.name}
                  </option>
                ))}
              </select>
              {isReadOnly && (
                 <span className="toolbar-badge-readonly" title="Read-only mode enabled. Editing is disabled.">🔒 Read-only</span>
              )}
              {!isReadOnly && isDirty && (
                 <span className="toolbar-badge-dirty" title="You have unsaved changes. Export CSV to save.">● Modified</span>
              )}
            </div>
          )}

          {showSearch && (
            <div className="search-container-expanded">
              <SearchBar schema={schema} specManager={specManager} spec={spec} />
            </div>
          )}

          {showActionsRow && (
            <>
              <div ref={groupMenuRef} style={{position: 'relative'}}>
                <button 
                  type="button" 
                  className={`toolbar-btn ${showGroupMenu ? 'active' : ''}`}
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                >
                  Group By... {spec?.state?.groupBy ? `(${spec.state.groupBy})` : ''}
                </button>
                {showGroupMenu && (
                  <div className="toolbar-actions" style={{top: '100%', left: 0, marginTop: '4px'}}>
                     <MultiLevelGrouping schema={schema} specManager={specManager} spec={spec} />
                  </div>
                )}
              </div>

              {sortLevels.length === 0 ? (
                <span className="toolbar-muted">No sorting applied</span>
              ) : (
                <MultiLevelSort schema={schema} specManager={specManager} spec={spec} />
              )}

              <div className="column-picker">
                <details>
                  <summary>⋮ Columns</summary>
                  <div className="column-picker-dropdown">
                    {orderedColumns
                      .filter(colName => !hiddenColumns.includes(colName))
                      .map(colName => (
                        <label
                          key={colName}
                          className="column-picker-item"
                          draggable
                          onDragStart={(event) => handleColumnDragStart(colName, event)}
                          onDragOver={handleColumnDragOver}
                          onDrop={(event) => handleColumnDrop(colName, event)}
                        >
                          <span className="column-drag-handle">⋮⋮</span>
                          <input
                            type="checkbox"
                            checked={!visibleColumns.length || visibleColumns.includes(colName)}
                            onChange={(event) => handleColumnToggle(colName, event.target.checked)}
                          />
                          {colName}
                        </label>
                      ))}
                  </div>
                </details>
              </div>

              <button
                className="toolbar-btn toolbar-hamburger"
                onClick={() => setShowActions(!showActions)}
                title="Open toolbar actions"
                ref={hamburgerRef}
              >
                ☰
              </button>

              {showActions && (
                <div className="toolbar-actions" ref={actionsRef}>
                  <button onClick={handleSaveAll} className="toolbar-btn" title="Export both Data and Spec">
                    💾 Save Project (Data + Spec)
                  </button>
                  <hr style={{margin: '4px 0', border: '0', borderTop: '1px solid #eee'}}/>
                  <button onClick={handleSaveSpec} className="toolbar-btn" title="Save current configuration only">
                     Save Spec Only
                  </button>
                  <button onClick={handleExportJSON} className="toolbar-btn" title="Export data as JSON">
                     Export JSON
                  </button>
                  <button onClick={handleExportCSV} className="toolbar-btn" title="Export data as CSV">
                    Export CSV
                  </button>
                  <hr style={{margin: '4px 0', border: '0', borderTop: '1px solid #eee'}}/>
                  <button onClick={handleResetSpec} className="toolbar-btn" title="Reset to default">
                    🔄 Reset
                  </button>
                  <button onClick={() => setShowPresetModal(!showPresetModal)} className="toolbar-btn">
                    ⚙️ Presets
                  </button>
                  <button onClick={() => setShowSettings(!showSettings)} className="toolbar-btn">
                    🛠️ Settings
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showSettings && showActionsRow && (
        <>
          <div className="preset-modal-overlay" onClick={() => setShowSettings(false)} />
          <div className="preset-modal">
            <div className="preset-modal-header">
              <h3>Settings</h3>
              <button className="preset-modal-close" onClick={() => setShowSettings(false)}>
                ✕
              </button>
            </div>
            <div className="preset-list">
              <div className="preset-item" style={{ cursor: 'default' }}>
                <div className="preset-item-name">Heuristics</div>
                <div className="preset-item-details">
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={!!heuristics?.enumInference}
                      onChange={(e) => onHeuristicsChange({
                        ...heuristics,
                        enumInference: e.target.checked
                      })}
                    />
                    Enum inference
                  </label>
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={!!heuristics?.setDetection}
                      onChange={(e) => onHeuristicsChange({
                        ...heuristics,
                        setDetection: e.target.checked
                      })}
                    />
                    Set detection
                  </label>
                </div>
              </div>
              <div className="preset-item" style={{ cursor: 'default' }}>
                <div className="preset-item-name">UI</div>
                <div className="preset-item-details">
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={!!rowMenuTriggers.handle}
                      onChange={(e) => updateRowMenuTrigger('handle', e.target.checked)}
                    />
                    Show row handle menu
                  </label>
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={!!rowMenuTriggers.shift}
                      onChange={(e) => updateRowMenuTrigger('shift', e.target.checked)}
                    />
                    Row menu with Shift + right-click
                  </label>
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={!!rowMenuTriggers.alt}
                      onChange={(e) => updateRowMenuTrigger('alt', e.target.checked)}
                    />
                    Row menu with Alt + right-click
                  </label>
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={!!rowMenuTriggers.replaceCell}
                      onChange={(e) => updateRowMenuTrigger('replaceCell', e.target.checked)}
                    />
                    Replace cell menu with row menu
                  </label>
                </div>
              </div>
              <div className="preset-item" style={{ cursor: 'default' }}>
                <div className="preset-item-name">Plugins</div>
                <div className="preset-item-details">
                  <div className="settings-section">
                    <span className="settings-section-title">Data source</span>
                    <label className="settings-checkbox">
                      <span>Mode</span>
                      <select
                        className="settings-input"
                        value={dataSourceSettings.mode || 'auto'}
                        onChange={(e) => {
                          const mode = e.target.value;
                          updateDataSource({
                            mode,
                            providerType: mode === 'provider'
                              ? (dataSourceSettings.providerType || providerOptions[0] || 'native')
                              : '',
                            config: mode === 'provider' ? (dataSourceSettings.config || {}) : {}
                          });
                        }}
                      >
                        <option value="auto">Auto (by file extension)</option>
                        <option value="provider">Provider override</option>
                      </select>
                    </label>
                    {dataSourceSettings.mode === 'provider' && (
                      <>
                        <label className="settings-checkbox">
                          <span>Provider</span>
                          <select
                            className="settings-input"
                            value={dataSourceSettings.providerType || providerOptions[0] || 'native'}
                            onChange={(e) => {
                              updateDataSource({
                                ...dataSourceSettings,
                                providerType: e.target.value,
                                config: {}
                              });
                            }}
                          >
                            {providerOptions.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </label>
                        {dataSourceSettings.providerType === 'duckdb' && (
                          <>
                            <label className="settings-checkbox">
                              <span>Endpoint</span>
                              <input
                                className="settings-input"
                                type="text"
                                placeholder="https://duckdb.example.com/query"
                                value={dataSourceSettings.config?.endpoint || ''}
                                onChange={(e) => updateDataSource({
                                  ...dataSourceSettings,
                                  config: {
                                    ...(dataSourceSettings.config || {}),
                                    endpoint: e.target.value
                                  }
                                })}
                              />
                            </label>
                            <label className="settings-checkbox">
                              <span>Table</span>
                              <input
                                className="settings-input"
                                type="text"
                                placeholder="metrics"
                                value={dataSourceSettings.config?.table || ''}
                                onChange={(e) => updateDataSource({
                                  ...dataSourceSettings,
                                  config: {
                                    ...(dataSourceSettings.config || {}),
                                    table: e.target.value
                                  }
                                })}
                              />
                            </label>
                          </>
                        )}
                        {dataSourceSettings.providerType === 'duckdb-wasm' && (
                          <label className="settings-checkbox">
                            <span>Table</span>
                            <input
                              className="settings-input"
                              type="text"
                              placeholder="data"
                              value={dataSourceSettings.config?.table || ''}
                              onChange={(e) => updateDataSource({
                                ...dataSourceSettings,
                                config: {
                                  ...(dataSourceSettings.config || {}),
                                  table: e.target.value
                                }
                              })}
                            />
                          </label>
                        )}
                        <div className="settings-hint">Changes reinitialize the dataset.</div>
                      </>
                    )}
                  </div>
                  <div className="settings-section">
                    <span className="settings-section-title">Providers</span>
                    {(pluginOptions?.providers || []).map((type) => (
                      <label key={type} className="settings-checkbox">
                        <input
                          type="checkbox"
                          checked={(pluginSettings?.providers || []).includes(type)}
                          onChange={(e) => {
                            const current = pluginSettings?.providers || [];
                            const next = e.target.checked
                              ? [...current, type]
                              : current.filter(value => value !== type);
                            onPluginSettingsChange({
                              ...pluginSettings,
                              providers: next
                            });
                          }}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  <div className="settings-section">
                    <span className="settings-section-title">Backends</span>
                    {(pluginOptions?.backends || []).map((type) => (
                      <label key={type} className="settings-checkbox">
                        <input
                          type="checkbox"
                          checked={(pluginSettings?.backends || []).includes(type)}
                          onChange={(e) => {
                            const current = pluginSettings?.backends || [];
                            const next = e.target.checked
                              ? [...current, type]
                              : current.filter(value => value !== type);
                            onPluginSettingsChange({
                              ...pluginSettings,
                              backends: next
                            });
                          }}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  <div className="settings-section">
                    <span className="settings-section-title">Views</span>
                    {(pluginOptions?.views || []).map((type) => (
                      <label key={type} className="settings-checkbox">
                        <input
                          type="checkbox"
                          checked={(pluginSettings?.views || []).includes(type)}
                          onChange={(e) => {
                            const current = pluginSettings?.views || [];
                            const next = e.target.checked
                              ? [...current, type]
                              : current.filter(value => value !== type);
                            onPluginSettingsChange({
                              ...pluginSettings,
                              views: next
                            });
                          }}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {showPresetModal && showActionsRow && (
        <>
          <div className="preset-modal-overlay" onClick={() => setShowPresetModal(false)} />
          <div className="preset-modal">
            <div className="preset-modal-header">
              <h3>Presets</h3>
              <button className="preset-modal-close" onClick={() => setShowPresetModal(false)}>
                ✕
              </button>
            </div>
            <div className="preset-list">
              {spec.presets && spec.presets.length > 0 ? (
                spec.presets.map(preset => (
                  <div
                    key={preset.name}
                    className="preset-item"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="preset-item-name">{preset.name}</div>
                    <div className="preset-item-details">
                      {preset.groupBy && <span>Group: {preset.groupBy}</span>}
                      {preset.filters?.length > 0 && <span> • {preset.filters.length} filter(s)</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No presets saved yet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Toolbar;
