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
 * ProviderRegistry keeps data providers pluggable without hardcoding implementations.
 */
export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  // Register a provider factory by type.
  register(type, factory) {
    this.providers.set(type, factory);
  }

  // Resolve a provider instance by type and optional config.
  create(type, config = {}) {
    const factory = this.providers.get(type);
    if (!factory) {
      throw new Error(`Unknown provider type: ${type}`);
    }
    return factory(config);
  }

  // List registered provider types.
  list() {
    return Array.from(this.providers.keys()).sort();
  }
}

export const providerRegistry = new ProviderRegistry();
