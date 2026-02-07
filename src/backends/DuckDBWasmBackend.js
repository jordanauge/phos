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
 * DuckDBWasmBackend provides storage/search using DuckDB-WASM.
 */
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_monitor from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?worker';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';

export class DuckDBWasmBackend {
  constructor(config = {}) {
    this.table = config.table || 'data';
    this.db = null;
    this.conn = null;
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

  async index(records) {
    await this.initDatabase();
    const tableName = this.getTableIdentifier();
    if (typeof records === 'string') {
      await this.db.registerFileText('backend.csv', records);
      await this.queryAll(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('backend.csv')`);
      return;
    }
    const jsonText = JSON.stringify(Array.isArray(records) ? records : []);
    await this.db.registerFileText('backend.json', jsonText);
    await this.queryAll(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_json_auto('backend.json')`);
  }

  async search(query) {
    await this.initDatabase();
    const tableName = this.getTableIdentifier();
    const nameColumn = this.quoteIdentifier('Name');
    if (!query) {
      return this.queryAll(`SELECT * FROM ${tableName}`);
    }

    const escaped = String(query).split("'").join("''");
    const sql = `SELECT * FROM ${tableName} WHERE CAST(${nameColumn} AS VARCHAR) ILIKE '%' || '${escaped}' || '%'`;
    return this.queryAll(sql);
  }

  async queryAll(sql) {
    const result = await this.conn.query(sql);
    return result.toArray();
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
}
