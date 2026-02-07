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
 * ViewRegistry keeps visualization views pluggable and discoverable.
 */
export class ViewRegistry {
  constructor() {
    this.views = new Map();
  }

  // Register a view plugin.
  register(view) {
    this.views.set(view.id, view);
  }

  // Resolve a view plugin by id.
  get(viewId) {
    return this.views.get(viewId);
  }

  // List all registered views.
  list() {
    return Array.from(this.views.values());
  }
}

export const viewRegistry = new ViewRegistry();
