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
 * Register default data providers.
 */
import { DuckDBWasmProvider } from '../providers/DuckDBWasmProvider';
import { NativeArrayProvider } from '../providers/NativeArrayProvider';
import { providerRegistry } from './ProviderRegistry';

// Register providers.
export function registerDefaultProviders() {
  providerRegistry.register('native', (config) => new NativeArrayProvider(config));
  providerRegistry.register('duckdb-wasm', (config) => new DuckDBWasmProvider(config));
}
