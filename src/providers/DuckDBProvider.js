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
 * DuckDBProvider queries a DuckDB HTTP service for large datasets.
 */
export class DuckDBProvider {
  constructor(config = {}) {
    this.endpoint = config.endpoint || '';
    this.table = config.table || '';
    this.schema = { columns: [], types: {}, hierarchy: {}, aliases: {} };
  }

  async load() {
    // No-op; data lives in DuckDB service.
  }

  async query(transform) {
    if (!this.endpoint) {
      throw new Error('DuckDBProvider requires an endpoint in spec.provider.config.endpoint');
    }
    if (!this.table) {
      throw new Error('DuckDBProvider requires a table in spec.provider.config.table');
    }

    const whereClause = this.buildWhereClause(transform.filters || []);
    const orderClause = this.buildOrderClause(transform.sort || []);
    const paginationClause = this.buildPaginationClause(transform.pagination);

    const sql = [
      `SELECT * FROM ${this.table}`,
      whereClause,
      orderClause,
      paginationClause
    ].filter(Boolean).join(' ');

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`DuckDBProvider query failed: ${message}`);
    }

    const data = await response.json();
    const totalCount = await this.queryCount(whereClause);

    return {
      data: Array.isArray(data) ? data : [],
      totalCount,
      schema: this.schema
    };
  }

  async queryCount(whereClause) {
    const countSql = [
      `SELECT COUNT(*) AS count FROM ${this.table}`,
      whereClause
    ].filter(Boolean).join(' ');

    const rows = await this.queryRaw(countSql);
    return rows[0]?.count || 0;
  }

  async getUniqueValues(column) {
    const sql = `SELECT DISTINCT ${column} FROM ${this.table}`;
    const rows = await this.queryRaw(sql);
    return rows.map(row => row[column]).filter(v => v != null);
  }

  async getSchema() {
    if (this.schema.columns.length > 0) {
      return this.schema;
    }

    const sql = `DESCRIBE ${this.table}`;
    const rows = await this.queryRaw(sql);
    this.schema = {
      columns: rows.map(row => ({ name: row.column_name || row.name, type: row.column_type || row.type })),
      types: {},
      hierarchy: {},
      aliases: {}
    };

    return this.schema;
  }

  async queryRaw(sql) {
    if (!this.endpoint) {
      throw new Error('DuckDBProvider requires an endpoint in spec.provider.config.endpoint');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`DuckDBProvider query failed: ${message}`);
    }

    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  }

  buildWhereClause(filters) {
    if (filters.length === 0) {
      return '';
    }

    const clauses = filters.map(filter => {
      const value = this.escapeValue(filter.value);
      switch (filter.operator) {
        case '=':
        case '!=':
        case '>':
        case '<':
        case '>=':
        case '<=':
          return `${filter.column} ${filter.operator} ${value}`;
        case 'LIKE':
          return `${filter.column} LIKE ${value}`;
        case 'ILIKE':
          return `${filter.column} ILIKE ${value}`;
        case 'in':
        case 'IN':
          if (Array.isArray(filter.value)) {
            const list = filter.value.map(val => this.escapeValue(val)).join(', ');
            return `${filter.column} IN (${list})`;
          }
          return `${filter.column} = ${value}`;
        default:
          return `${filter.column} = ${value}`;
      }
    });

    return `WHERE ${clauses.join(' AND ')}`;
  }

  buildOrderClause(sort) {
    if (sort.length === 0) {
      return '';
    }

    const clauses = sort.map(rule => `${rule.column} ${String(rule.direction).toUpperCase()}`);
    return `ORDER BY ${clauses.join(', ')}`;
  }

  buildPaginationClause(pagination) {
    if (!pagination || pagination.limit === undefined) {
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
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
  }
}
