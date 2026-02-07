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
 * DuckDBBackend connects to a DuckDB HTTP service for large datasets.
 */
export class DuckDBBackend {
  constructor(config = {}) {
    this.endpoint = config.endpoint || '';
    this.table = config.table || '';
    this.searchColumns = config.searchColumns || [];
  }

  // Indexing is handled by the DuckDB service; keep this as a no-op.
  index() {}

  // Execute a raw SQL query through the DuckDB service.
  async query(sql) {
    if (!this.endpoint) {
      throw new Error('DuckDBBackend requires an endpoint in spec.backend.config.endpoint');
    }
    if (!sql) {
      return [];
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`DuckDBBackend query failed: ${message}`);
    }

    return response.json();
  }

  // Basic text search across configured columns.
  async search(text) {
    if (!text) {
      return this.query(`SELECT * FROM ${this.table}`);
    }

    if (!this.table || this.searchColumns.length === 0) {
      throw new Error('DuckDBBackend requires config.table and config.searchColumns for search');
    }

    const escapedText = String(text).replace(/'/g, "''");
    const conditions = this.searchColumns
      .map(col => `${col} ILIKE '%' || '${escapedText}' || '%'`)
      .join(' OR ');

    const sql = `SELECT * FROM ${this.table} WHERE ${conditions}`;
    return this.query(sql);
  }
}
