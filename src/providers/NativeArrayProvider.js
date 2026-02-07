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
 * Native JavaScript DataProvider
 * Uses Array.filter, Array.sort, Array.slice for all operations
 * No dependencies - works in any JS environment
 */
export class NativeArrayProvider {
  constructor() {
    this.data = [];
    this.schema = { columns: [], types: {}, hierarchy: {}, aliases: {} };
  }

  async load(input) {
    // Accept array directly or parse from different formats
    let rawData = [];
    if (Array.isArray(input)) {
      rawData = input;
    } else if (typeof input === 'string') {
      // Assume CSV string - simple parser
      rawData = this.parseCSV(input);
    } else if (input.data && Array.isArray(input.data)) {
      // Observable FileAttachment format
      rawData = input.data;
    } else {
      throw new Error('Unsupported data format. Expected array or CSV string.');
    }

    // Add unique row IDs if missing
    this.data = rawData.map((row, index) => ({
      ...row,
      __rowid: row.__rowid || `row_${index}_${Date.now()}`
    }));

    // Infer schema from data
    this.schema = this.inferSchema(this.data);
  }

  async query(transform) {
    let filtered = [...this.data];

    // Apply filters
    if (transform.filters?.length > 0) {
      filtered = filtered.filter(row => this.matchesFilters(row, transform.filters));
    }

    // Apply sort
    if (transform.sort?.length > 0) {
      filtered = this.applySorting(filtered, transform.sort);
    }

    const totalCount = filtered.length;

    // Apply pagination (if limit is undefined, return all data)
    if (transform.pagination && transform.pagination.limit !== undefined) {
      const { limit, offset } = transform.pagination;
      filtered = filtered.slice(offset, offset + limit);
    }

    return {
      data: filtered,
      totalCount,
      schema: this.schema
    };
  }

  async getUniqueValues(column) {
    const valuesSet = new Set();
    
    this.data.forEach(row => {
      const value = row[column];
      
      // Handle array values - add each element separately
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (v != null && v !== '') {
            valuesSet.add(v);
          }
        });
      } else if (value != null && value !== '') {
        valuesSet.add(value);
      }
    });
    
    return Array.from(valuesSet).sort();
  }

  async getSchema() {
    return this.schema;
  }

  // ============ mutations ============

  async updateCell(rowId, column, value) {
    const row = this.data.find(r => r.__rowid === rowId);
    if (!row) {
      throw new Error(`Row with ID ${rowId} not found.`);
    }
    
    // Parse value if necessary (simple heuristic)
    let parsedValue = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value)) && value !== '' && value !== null) {
      // Keep as string if it looks like an ID or code not meant for math, 
      // but for now let's try to infer number if the column matches
      const currentType = this.schema.types[column];
      if (currentType === 'number') {
        parsedValue = Number(value);
      }
    }

    row[column] = parsedValue;
    
    // Optionally re-infer schema if a new field was added or type changed dramatically?
    // For performance, we skip full schema inference on every edit,
    // assuming structure hasn't changed.
  }

  async deleteRow(rowId) {
    this.data = this.data.filter(r => r.__rowid !== rowId);
  }

  async duplicateRow(rowId) {
    const row = this.data.find(r => r.__rowid === rowId);
    if (row) {
      const newRow = { 
        ...row, 
        __rowid: `row_${this.data.length}_${Date.now()}` // Generate new ID
      };
      // Insert after the original row
      const idx = this.data.findIndex(r => r.__rowid === rowId);
      this.data.splice(idx + 1, 0, newRow);
    }
  }

  async addColumn(name, defaultValue = null) {
    if (this.schema.columns.some(c => c.name === name)) {
      throw new Error(`Column '${name}' already exists.`);
    }

    this.data.forEach(row => {
      row[name] = defaultValue;
    });

    // Refresh schema
    this.schema = this.inferSchema(this.data);
  }

  async renameColumn(oldName, newName) {
     if (this.schema.columns.some(c => c.name === newName)) {
      throw new Error(`Column '${newName}' already exists.`);
    }

    this.data.forEach(row => {
      row[newName] = row[oldName];
      delete row[oldName];
    });
    
    this.schema = this.inferSchema(this.data);
  }

  async deleteColumn(name) {
    this.data.forEach(row => {
      delete row[name];
    });
    this.schema = this.inferSchema(this.data);
  }

  // ============ Private Helper Methods ============

  parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }

    return rows;
  }

  inferSchema(data) {
    if (data.length === 0) {
      return { columns: [], types: {}, hierarchy: {}, aliases: {} };
    }

    const sample = data[0];
    const columns = [];
    const types = {};
    const hierarchy = {};
    const aliases = {};

    Object.keys(sample).forEach(key => {
      if (key.startsWith('__')) return;
      
      const type = this.inferType(sample[key]);
      columns.push({ name: key, type });
      types[key] = type;

      // Detect hierarchies (e.g., "Category > Subcategory")
      if (typeof sample[key] === 'string' && sample[key].includes('>')) {
        hierarchy[key] = { delimiter: '>' };
        types[key] = 'hierarchy';
      }
    });

    return { columns, types, hierarchy, aliases };
  }

  inferType(value) {
    if (value == null) return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    
    // Try parsing as date
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      return 'date';
    }

    // Try parsing as number
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return 'number';
    }

    return 'string';
  }

  matchesFilters(row, filters) {
    return filters.every(filter => {
      // Handle multi-column search (OR logic)
      if (filter.columns) {
        return filter.columns.some(col => 
          this.checkCondition(row[col], filter.operator, filter.value)
        );
      }
      // Handle single column search
      return this.checkCondition(row[filter.column], filter.operator, filter.value);
    });
  }

  checkCondition(value, operator, filterValue) {
    switch (operator) {
      case '=':
        // For arrays, check if filterValue is in the array
        if (Array.isArray(value)) {
          return value.includes(filterValue);
        }
        return value === filterValue;
      case '!=':
        if (Array.isArray(value)) {
          return !value.includes(filterValue);
        }
        return value !== filterValue;
      case '>':
        return value > filterValue;
      case '<':
        return value < filterValue;
      case '>=':
        return value >= filterValue;
      case '<=':
        return value <= filterValue;
      case 'LIKE':
        return String(value).includes(String(filterValue));
      case 'ILIKE':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'IN':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'in':
        // ANY mode: value matches at least one filter value
        if (Array.isArray(value)) {
          // Row value is array: check if any element matches any filter value
          return Array.isArray(filterValue) && filterValue.some(fv => value.includes(fv));
        }
        // Row value is scalar: check if it matches any filter value
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'in_all':
        // ALL mode: row value must contain all filter values
        if (Array.isArray(value)) {
          // Row value is array: check all filter values are in it
          return Array.isArray(filterValue) && filterValue.every(fv => value.includes(fv));
        }
        // Row value is scalar (shouldn't happen for set attributes)
        const rowValues = String(value).split(',').map(v => v.trim());
        return Array.isArray(filterValue) && filterValue.every(fv => rowValues.includes(fv));
      case 'BETWEEN':
        return Array.isArray(filterValue) && value >= filterValue[0] && value <= filterValue[1];
      case 'IS NULL':
        return value == null;
      case 'IS NOT NULL':
        return value != null;
      default:
        return true;
    }
  }

  applySorting(data, sort) {
    return data.sort((a, b) => {
      for (const rule of sort) {
        const aVal = a[rule.column];
        const bVal = b[rule.column];

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        if (comparison !== 0) {
          return rule.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }
}
