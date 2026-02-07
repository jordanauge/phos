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
 * Filter Categories UI Component
 * Groups filters by type/category for better organization
 */

import { html } from 'npm:htl';

export function renderFilterCategories(schema, provider, specManager, state, uniqueValuesMap) {
  // Group columns by type/category
  const categories = new Map();
  
  schema.columns.forEach(col => {
    const category = col.category || getCategoryFromType(col.type);
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(col);
  });

  function getCategoryFromType(type) {
    const typeMap = {
      'string': '📝 Text',
      'number': '🔢 Numbers',
      'integer': '🔢 Numbers',
      'float': '🔢 Numbers',
      'boolean': '✓ Yes/No',
      'date': '📅 Dates',
      'hierarchy': '🌳 Hierarchical'
    };
    return typeMap[type] || '📦 Other';
  }

  function handleFilterChange(column, value) {
    if (value) {
      // Remove existing filter for this column before adding new one
      // to avoid accumulating multiple filters for same column (unless multi-select supported)
      specManager.removeFilter(column);
      specManager.addFilter({
        column,
        operator: '=',
        value,
        enabled: true
      });
    } else {
      specManager.removeFilter(column);
    }
  }

  function renderFilter(col) {
    const uniqueValues = uniqueValuesMap.get(col.name) || [];
    const currentFilter = state.spec.state.filters.find(f => f.column === col.name);
    
    return html`<div class="filter-section">
      <label title=${col.type}>${col.name}</label>
      <select onchange=${(e) => handleFilterChange(col.name, e.target.value)}>
        <option value="">All</option>
        ${uniqueValues.slice(0, 50).map(v => html`<option value=${v} selected=${currentFilter?.value == v}>${v}</option>`)}
        ${uniqueValues.length > 50 ? html`<option disabled>... ${uniqueValues.length - 50} more</option>` : ''}
      </select>
    </div>`;
  }

  return html`<div class="filter-categories">${Array.from(categories.entries()).map(([category, columns]) => html`<details class="filter-category" open=${true}>
        <summary>
          ${category} 
          <span class="category-count">(${columns.length})</span>
        </summary>
        <div class="filter-category-content">
          ${columns.map(col => renderFilter(col))}
        </div>
      </details>`)}</div>`;
}
