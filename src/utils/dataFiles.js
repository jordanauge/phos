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
 * Data file utilities for listing datasets and their spec associations.
 */

// JSON datasets (exclude spec and settings files).
const jsonLoaders = import.meta.glob('../data/*.json', { import: 'default' });
// CSV datasets loaded as raw text.
const csvLoaders = import.meta.glob('../data/*.csv', { query: '?raw', import: 'default' });
// Spec files named like <dataset>.spec.json or <dataset>-spec.json
const specLoaders = {
  ...import.meta.glob('../data/*.spec.json', { import: 'default' }),
  ...import.meta.glob('../data/*-spec.json', { import: 'default' })
};

function getBaseName(filePath) {
  const fileName = filePath.split('/').pop() || '';
  return fileName
    .replace(/\.spec\.json$/i, '')
    .replace(/-spec\.json$/i, '')
    .replace(/\.json$/i, '')
    .replace(/\.csv$/i, '');
}

function isSpecFile(filePath) {
  return filePath.endsWith('.spec.json') || filePath.endsWith('-spec.json');
}

function isSettingsFile(filePath) {
  return filePath.endsWith('/settings.json') || filePath.endsWith('settings.json');
}

// List dataset files available for selection.
export function listDataFiles() {
  const jsonFiles = Object.keys(jsonLoaders)
    .filter(path => !isSpecFile(path) && !isSettingsFile(path))
    .map(path => ({
      path,
      name: path.split('/').pop() || '',
      base: getBaseName(path),
      type: 'json'
    }));

  const csvFiles = Object.keys(csvLoaders).map(path => ({
    path,
    name: path.split('/').pop() || '',
    base: getBaseName(path),
    type: 'csv'
  }));

  return [...jsonFiles, ...csvFiles].sort((a, b) => a.name.localeCompare(b.name));
}

// Load dataset content (JSON or CSV) for a selected file.
export async function loadDataFile(file) {
  if (file.type === 'json') {
    const loader = jsonLoaders[file.path];
    return loader ? loader() : null;
  }

  if (file.type === 'csv') {
    const loader = csvLoaders[file.path];
    return loader ? loader() : '';
  }

  return null;
}

// Choose a provider type based on file extension mapping.
export function getProviderTypeForFile(file, mapping = {}) {
  if (!file?.name) {
    return mapping.default || 'native';
  }
  const extension = file.name.includes('.')
    ? `.${file.name.split('.').pop()}`
    : '';
  return mapping[extension] || mapping.default || 'native';
}

// Load spec for a dataset by matching <base>.spec.json.
export async function loadSpecForData(file) {
  const specPath = Object.keys(specLoaders).find(path => getBaseName(path) === file.base);
  if (specPath) {
    return specLoaders[specPath]();
  }

  return null;
}
