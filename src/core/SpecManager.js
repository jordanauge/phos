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
 * Spec-driven State Management
 * Spec files act as "Virtual DOM" - all UI state serializable
 */
import { safeJsonParse } from '../utils/safeJsonParse';

export class SpecManager {
  constructor(initialSpec = {}) {
    // Default state
    const defaultState = {
      filters: [],
      sort: [],
      pagination: { page: 1, pageSize: 50 },
      groupBy: null,
      groupLevels: [],
      visibleColumns: [],
      columnOrder: [],
      filterCategories: {},
      activeView: 'grid',
      hiddenFilters: [],
      hiddenColumns: [],
      collapsedFilters: []
    };
    
    this.spec = {
      version: '1.0.0',
      dataSource: { type: 'inline', data: [] },
      provider: { type: 'native' },
      visualizations: [],
      presets: [],
      ...initialSpec,
      // Deep merge state to preserve defaults
      state: {
        ...defaultState,
        ...initialSpec.state
      }
    };
    
    this.provider = null;
    this.backend = null;
    this.listeners = new Set();
    this.dataDirty = false;
  }

  /**
   * Check if data has been modified since load
   */
  isDataDirty() {
    return this.dataDirty;
  }

  /**
   * Reset dirty state (e.g. after save)
   */
  resetDirty() {
    this.dataDirty = false;
    this.notifyListeners();
  }

  /**
   * Load spec from JSON
   */
  static fromJSON(json) {
    const spec = safeJsonParse(json);
    return new SpecManager(spec);
  }

  /**
   * Export current spec as JSON
   */
  toJSON() {
    return JSON.stringify(this.spec, null, 2);
  }

  /**
   * Get current spec (immutable)
   */
  getSpec() {
    return this.spec;
  }

  /**
   * Update spec (triggers reactive updates)
   */
  updateSpec(updates) {
    this.spec = { ...this.spec, ...updates };
    this.notifyListeners();
  }

  /**
   * Update UI state
   */
  updateState(updates) {
    this.spec.state = { ...this.spec.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Add filter
   */
  addFilter(filter) {
    this.spec.state.filters.push(filter);
    this.notifyListeners();
  }

  /**
   * Remove filter
   */
  removeFilter(column) {
    this.spec.state.filters = this.spec.state.filters.filter(f => f.column !== column);
    this.notifyListeners();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.spec.state.filters = [];
    this.notifyListeners();
  }

  /**
   * Toggle filter enabled state
   */
  toggleFilter(column) {
    const filter = this.spec.state.filters.find(f => f.column === column);
    if (filter) {
      filter.enabled = !filter.enabled;
      this.notifyListeners();
    }
  }

  /**
   * Set sort
   */
  setSort(sortLevels) {
    // Accept both array and single object for backwards compatibility
    if (Array.isArray(sortLevels)) {
      this.spec.state.sort = sortLevels;
    } else if (sortLevels && typeof sortLevels === 'object') {
      // Single sort object { column, direction }
      this.spec.state.sort = [sortLevels];
    } else {
      this.spec.state.sort = [];
    }
    this.notifyListeners();
  }

  /**
   * Add sort level (for multi-level sorting)
   */
  addSortLevel(sortItem) {
    if (!this.spec.state.sort) {
      this.spec.state.sort = [];
    }
    this.spec.state.sort.push(sortItem);
    this.notifyListeners();
  }

  /**
   * Clear sort
   */
  clearSort() {
    this.spec.state.sort = [];
    this.notifyListeners();
  }

  /**
   * Set pagination
   */
  setPagination(page, pageSize) {
    const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
    let safePageSize = pageSize;
    if (pageSize !== null && pageSize !== undefined) {
      const numericPageSize = Number(pageSize);
      safePageSize = Number.isFinite(numericPageSize)
        ? Math.max(0, numericPageSize)
        : this.spec.state.pagination.pageSize;
    }
    this.spec.state.pagination = { page: safePage, pageSize: safePageSize };
    this.notifyListeners();
  }

  /**
   * Set group by
   */
  setGroupBy(column) {
    this.spec.state.groupBy = column;
    this.spec.state.groupLevels = column ? [column] : [];
    this.notifyListeners();
  }

  /**
   * Set multi-level group by
   */
  setGroupLevels(levels) {
    const normalized = Array.isArray(levels) ? levels.filter(Boolean) : [];
    this.spec.state.groupLevels = normalized;
    this.spec.state.groupBy = normalized[0] || null;
    this.notifyListeners();
  }

  /**
   * Set visible columns
   */
  setVisibleColumns(columns) {
    this.spec.state.visibleColumns = columns;
    this.notifyListeners();
  }

  /**
   * Set active view
   */
  setActiveView(view) {
    this.spec.state.activeView = view;
    this.notifyListeners();
  }

  /**
   * NEW: Add a preset (saved groupBy configuration)
   */
  addPreset(preset) {
    if (!this.spec.presets) this.spec.presets = [];
    this.spec.presets.push(preset);
    this.notifyListeners();
  }

  /**
   * NEW: Apply a preset by name
   */
  applyPreset(presetName) {
    const preset = this.spec.presets?.find(p => p.name === presetName);
    if (preset) {
      this.setGroupBy(preset.groupBy);
      if (preset.filters) {
        this.spec.state.filters = preset.filters.map(f => ({ ...f, enabled: true }));
        this.notifyListeners();
      }
    }
  }

  /**
   * Convert spec state to TransformState for provider
   * Handles multi-value filters with ANY/ALL modes
   */
  toTransformState() {
    // Group filters by column
    const filtersByColumn = new Map();
    this.spec.state.filters
      .filter(f => f.enabled)
      .forEach(f => {
        if (!filtersByColumn.has(f.column)) {
          filtersByColumn.set(f.column, []);
        }
        filtersByColumn.get(f.column).push(f);
      });

    // Convert grouped filters to provider format
    const enabledFilters = [];
    filtersByColumn.forEach((filters, column) => {
      if (filters.length === 1) {
        // Single filter - simple case
        enabledFilters.push({
          column: filters[0].column,
          operator: filters[0].operator,
          value: filters[0].value
        });
      } else {
        // Multiple filters on same column
        const mode = filters[0].mode || 'ANY';
        enabledFilters.push({
          column,
          operator: mode === 'ANY' ? 'in' : 'in_all',
          value: filters.map(f => f.value),
          mode
        });
      }
    });

    const transformState = {
      filters: enabledFilters,
      sort: this.spec.state.sort.map(s => ({
        column: s.column,
        direction: s.direction
      }))
    };
    
    // Only apply pagination when a page size is provided.
    const pageSize = this.spec.state.pagination.pageSize;
    if (pageSize !== null && pageSize !== undefined) {
      const safePageSize = Number.isFinite(Number(pageSize))
        ? Math.max(0, Number(pageSize))
        : 0;
      const safePage = Number.isFinite(Number(this.spec.state.pagination.page))
        ? Math.max(1, Number(this.spec.state.pagination.page))
        : 1;
      transformState.pagination = {
        limit: safePageSize,
        offset: (safePage - 1) * safePageSize
      };
    }
    
    return transformState;
  }

  /**
   * Query data using current spec state
   */
  async query() {
    if (!this.provider) {
      throw new Error('No data provider initialized. Call setProvider() first.');
    }
    const transform = this.toTransformState();
    return this.provider.query(transform);
  }

  /**
   * Check if the current provider supports data mutations.
   */
  supportsDataMutations() {
    return !!this.provider
      && typeof this.provider.updateCell === 'function'
      && typeof this.provider.deleteRow === 'function'
      && typeof this.provider.duplicateRow === 'function';
  }

  /**
   * Update a single cell by row identifier.
   */
  async updateCell(rowId, column, value) {
    if (!this.provider || typeof this.provider.updateCell !== 'function') {
      throw new Error('Data mutations are not supported by the current provider.');
    }
    await this.provider.updateCell(rowId, column, value);
    this.dataDirty = true;
    this.notifyListeners();
  }

  /**
   * Update rows matching a column value.
   */
  async updateRowsByColumn(column, matchValue, updates) {
    if (!this.provider || typeof this.provider.updateRowsByColumn !== 'function') {
      throw new Error('Data mutations are not supported by the current provider.');
    }
    await this.provider.updateRowsByColumn(column, matchValue, updates);
    this.dataDirty = true;
    this.notifyListeners();
  }

  /**
   * Delete a row by identifier.
   */
  async deleteRow(rowId) {
    if (!this.provider || typeof this.provider.deleteRow !== 'function') {
      throw new Error('Data mutations are not supported by the current provider.');
    }
    await this.provider.deleteRow(rowId);
    this.dataDirty = true;
    this.notifyListeners();
  }

  /**
   * Duplicate a row by identifier.
   */
  async duplicateRow(rowId) {
    if (!this.provider || typeof this.provider.duplicateRow !== 'function') {
      throw new Error('Data mutations are not supported by the current provider.');
    }
    await this.provider.duplicateRow(rowId);
    this.dataDirty = true;
    this.notifyListeners();
  }

  /**
   * Add a new column to the dataset.
   */
  async addColumn(name, defaultValue = null) {
    if (!this.provider || typeof this.provider.addColumn !== 'function') {
      throw new Error('Schema mutations are not supported by the current provider.');
    }
    await this.provider.addColumn(name, defaultValue);
    this.dataDirty = true;
    // Notify listeners so UI updates schema
    this.notifyListeners();
  }

  /**
   * Set data provider
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Set storage/search backend
   */
  setBackend(backend) {
    this.backend = backend;
  }

  /**
   * Get storage/search backend
   */
  getBackend() {
    return this.backend;
  }

  /**
   * Subscribe to spec changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of spec changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.spec));
  }
}
