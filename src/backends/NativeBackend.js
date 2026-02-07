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
 * NativeBackend provides an in-memory storage and search backend.
 */
export class NativeBackend {
  constructor() {
    this.records = [];
    this.kv = new Map();
  }

  // Index records for internal search.
  index(records) {
    this.records = Array.isArray(records) ? records : [];
  }

  // Simple text search across all fields.
  search(query) {
    if (!query) {
      return this.records;
    }
    const lowerQuery = String(query).toLowerCase();
    return this.records.filter(record =>
      Object.values(record).some(value =>
        String(value).toLowerCase().includes(lowerQuery)
      )
    );
  }

  // Store arbitrary values by key.
  store(key, value) {
    this.kv.set(key, value);
  }

  // Retrieve stored values by key.
  get(key) {
    return this.kv.get(key);
  }
}
