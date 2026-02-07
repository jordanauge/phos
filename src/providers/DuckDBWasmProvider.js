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
 * DuckDBWasmProvider uses DuckDB-WASM for in-browser analytics on large datasets.
 */
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_monitor from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?worker';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';

export class DuckDBWasmProvider {
  constructor(config = {}) {
    this.table = config.table || 'data';
    this.schema = { columns: [], types: {}, hierarchy: {}, aliases: {} };
    this.columnSet = null;
    this.db = null;
    this.conn = null;
  }

  async load(input) {
    await this.initDatabase();

    if (Array.isArray(input)) {
      await this.loadJsonArray(input);
      return;
    }

    if (typeof input === 'string') {
      await this.loadCsvText(input);
      return;
    }

    if (input && Array.isArray(input.data)) {
      await this.loadJsonArray(input.data);
      return;
    }

    throw new Error('DuckDBWasmProvider expects array or CSV string input.');
  }

  async query(transform) {
    await this.ensureSchema();
    const whereClause = this.buildWhereClause(transform.filters || []);
    const orderClause = this.buildOrderClause(transform.sort || []);
    const paginationClause = this.buildPaginationClause(transform.pagination);

    const sql = [
      this.buildSelectClause(),
      whereClause,
      orderClause,
      paginationClause
    ].filter(Boolean).join(' ');

    const data = await this.queryAll(sql);
    const totalCount = await this.queryCount(whereClause);

    return {
      data,
      totalCount,
      schema: this.schema
    };
  }

  async getUniqueValues(column) {
    await this.ensureSchema();
    const columnName = this.assertColumn(column);
    const tableName = this.getTableIdentifier();
    const rows = await this.queryAll(`SELECT DISTINCT ${columnName} AS value FROM ${tableName}`);
    return rows.map(row => row.value).filter(v => v != null);
  }

  async getSchema() {
    if (this.schema.columns.length > 0) {
      return this.schema;
    }

    const tableName = this.getTableIdentifier();
    const rows = await this.queryAll(`DESCRIBE ${tableName}`);
    const columns = rows.map(row => ({
      name: row.column_name || row.name,
      type: row.column_type || row.type
    }));
    const types = {};
    columns.forEach(col => {
      types[col.name] = col.type;
    });
    this.schema = {
      columns,
      types,
      hierarchy: {},
      aliases: {}
    };
    this.columnSet = new Set(columns.map(col => col.name));

    return this.schema;
  }

  async ensureSchema() {
    if (this.schema.columns.length === 0) {
      await this.getSchema();
    }
  }

  async initDatabase() {
    if (this.db && this.conn) {
      return;
    }

    const worker = new duckdb_monitor();
    this.db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
    await this.db.instantiate(duckdb_wasm);
    this.conn = await this.db.connect();
  }

  async loadCsvText(csvText) {
    await this.db.registerFileText('data.csv', csvText);
    const tableName = this.getTableIdentifier();
    await this.queryAll(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('data.csv')`);
    this.schema = { columns: [], types: {}, hierarchy: {}, aliases: {} };
    this.columnSet = null;
  }

  async loadJsonArray(jsonArray) {
    const jsonText = JSON.stringify(jsonArray);
    await this.db.registerFileText('data.json', jsonText);
    const tableName = this.getTableIdentifier();
    await this.queryAll(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_json_auto('data.json')`);
    this.schema = { columns: [], types: {}, hierarchy: {}, aliases: {} };
    this.columnSet = null;
  }

  async queryAll(sql) {
    const result = await this.conn.query(sql);
    return result.toArray();
  }

  async queryCount(whereClause) {
    const tableName = this.getTableIdentifier();
    const sql = [
      `SELECT COUNT(*) AS count FROM ${tableName}`,
      whereClause
    ].filter(Boolean).join(' ');
    const rows = await this.queryAll(sql);
    return rows[0]?.count || 0;
  }

  buildWhereClause(filters) {
    if (filters.length === 0) {
      return '';
    }

    const clauses = filters.map(filter => {
      const operator = String(filter.operator || '=').toUpperCase();
      const column = this.assertColumn(filter.column);
      const value = this.escapeValue(filter.value);
      switch (operator) {
        case '=':
        case '!=':
        case '>':
        case '<':
        case '>=':
        case '<=':
          return `${column} ${operator} ${value}`;
        case 'LIKE':
          return `${column} LIKE ${value}`;
        case 'ILIKE':
        case 'IN':
          if (Array.isArray(filter.value)) {
            if (filter.value.length === 0) {
              return 'FALSE';
            }
            const list = filter.value.map(val => this.escapeValue(val)).join(', ');
            return `${column} IN (${list})`;
          }
          return `${column} = ${value}`;
        case 'IN_ALL':
          return this.buildInAllClause(filter.column, filter.value);
        case 'BETWEEN':
          if (Array.isArray(filter.value) && filter.value.length >= 2) {
            const start = this.escapeValue(filter.value[0]);
            const end = this.escapeValue(filter.value[1]);
            return `${column} BETWEEN ${start} AND ${end}`;
          }
          return 'FALSE';
        case 'IS NULL':
          return `${column} IS NULL`;
        case 'IS NOT NULL':
          return `${column} IS NOT NULL`;
        default:
          return `${column} = ${value}`;
      }
    });

    return `WHERE ${clauses.join(' AND ')}`;
  }

  buildOrderClause(sort) {
    if (sort.length === 0) {
      return '';
    }

    const clauses = sort.map(rule => {
      const column = this.assertColumn(rule.column);
      const direction = String(rule.direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      return `${column} ${direction}`;
    });
    return `ORDER BY ${clauses.join(', ')}`;
  }

  buildPaginationClause(pagination) {
    if (pagination?.limit === undefined) {
      return '';
    }

    const limit = Number(pagination.limit);
    const offset = Number(pagination.offset || 0);
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  escapeValue(value) {
    if (value == null) {
      return 'NULL';
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (Array.isArray(value)) {
      const list = value.map(item => this.escapeValue(item));
      return `(${list.join(', ')})`;
    }
    const escaped = String(value).split("'").join("''");
    return `'${escaped}'`;
  }

  buildSelectClause() {
    const tableName = this.getTableIdentifier();
    return `SELECT rowid AS "__rowid", * FROM ${tableName}`;
  }

  buildInAllClause(columnName, values) {
    const column = this.assertColumn(columnName);
    if (!Array.isArray(values) || values.length === 0) {
      return 'FALSE';
    }
    if (this.isListColumn(columnName)) {
      return values
        .map(value => `list_contains(${column}, ${this.escapeValue(value)})`)
        .join(' AND ');
    }
    if (values.length === 1) {
      return `${column} = ${this.escapeValue(values[0])}`;
    }
    return 'FALSE';
  }

  isListColumn(columnName) {
    const type = this.schema.types?.[columnName];
    if (!type) {
      return false;
    }
    const normalized = String(type).toLowerCase();
    return normalized.includes('list') || normalized.includes('[]');
  }

  assertColumn(columnName) {
    if (!this.columnSet || this.schema.columns.length === 0) {
      throw new Error('Schema is not loaded; cannot validate columns.');
    }
    if (!this.columnSet.has(columnName)) {
      throw new Error(`Unknown column: ${columnName}`);
    }
    return this.quoteIdentifier(columnName);
  }

  getTableIdentifier() {
    const tableName = String(this.table || 'data');
    if (!/^\w+$/.test(tableName) || /^\d/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    return this.quoteIdentifier(tableName);
  }

  quoteIdentifier(name) {
    const escaped = String(name).split('"').join('""');
    return `"${escaped}"`;
  }

  async updateCell(rowId, column, value) {
    await this.ensureSchema();
    const rowIdentifier = Number(rowId);
    if (!Number.isFinite(rowIdentifier)) {
      throw new TypeError('Row identifier is missing or invalid.');
    }
    const tableName = this.getTableIdentifier();
    const columnName = this.assertColumn(column);
    const sql = `UPDATE ${tableName} SET ${columnName} = ${this.escapeValue(value)} WHERE rowid = ${rowIdentifier}`;
    await this.queryAll(sql);
  }

  async updateRowsByColumn(column, matchValue, updates) {
    await this.ensureSchema();
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }
    const tableName = this.getTableIdentifier();
    const matchColumn = this.assertColumn(column);
    const assignments = Object.entries(updates).map(([key, value]) => {
      const updateColumn = this.assertColumn(key);
      return `${updateColumn} = ${this.escapeValue(value)}`;
    }).join(', ');
    const sql = `UPDATE ${tableName} SET ${assignments} WHERE ${matchColumn} = ${this.escapeValue(matchValue)}`;
    await this.queryAll(sql);
  }

  async deleteRow(rowId) {
    const rowIdentifier = Number(rowId);
    if (!Number.isFinite(rowIdentifier)) {
      throw new TypeError('Row identifier is missing or invalid.');
    }
    const tableName = this.getTableIdentifier();
    await this.queryAll(`DELETE FROM ${tableName} WHERE rowid = ${rowIdentifier}`);
  }

  async duplicateRow(rowId) {
    await this.ensureSchema();
    const rowIdentifier = Number(rowId);
    if (!Number.isFinite(rowIdentifier)) {
      throw new TypeError('Row identifier is missing or invalid.');
    }
    const tableName = this.getTableIdentifier();
    const columns = this.schema.columns.map(col => this.quoteIdentifier(col.name));
    const columnList = columns.join(', ');
    const sql = `INSERT INTO ${tableName} (${columnList}) SELECT ${columnList} FROM ${tableName} WHERE rowid = ${rowIdentifier}`;
    await this.queryAll(sql);
  }
}
