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

import React, { useEffect, useMemo, useState } from 'react';
import './SearchBar.css';

function SearchBar({ schema, specManager, spec }) {
  const [searchText, setSearchText] = useState('');
  const [filterTokens, setFilterTokens] = useState([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const syncEnabled = spec?.settings?.ui?.syncFiltersToSearch !== false;

  const normalizedFilters = useMemo(() => {
    return spec.state.filters || [];
  }, [spec.state.filters]);

  useEffect(() => {
    // When filters change (search completes), stop waiting
    if (isWaiting) {
      setIsWaiting(false);
    }
    if (!syncEnabled) {
      return;
    }
    const nextTokens = normalizedFilters.map(filter => ({
      column: filter.column,
      operator: filter.operator,
      value: filter.value
    }));
    setFilterTokens(nextTokens);
  }, [normalizedFilters, syncEnabled]);

  const parseInput = (text) => {
    const match = text.match(/^([^:]+):(.+)$/);
    if (match) {
      const column = match[1].trim();
      const rawValue = match[2].trim();
      const operatorMatch = rawValue.match(/^(>=|<=|!=|=|>|<|~|LIKE|IN)?(.*)$/);
      const operator = operatorMatch[1] || '=';
      const value = operatorMatch[2].trim();
      return { type: 'filter', column, operator, value };
    }
    return { type: 'fulltext', value: text.trim() };
  };

  const removeFilterToken = (token) => {
    const index = spec.state.filters.findIndex(
      f => f.column === token.column && f.operator === token.operator && f.value === token.value
    );
    if (index >= 0) {
      spec.state.filters.splice(index, 1);
      specManager.notifyListeners();
    }
  };

  const handleTokenEdit = (token) => {
    removeFilterToken(token);
    setSearchText(`${token.column}:${token.operator === '=' ? '' : token.operator}${token.value}`);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    setIsWaiting(true);

    // Short delay to allow UI to update (spinner to appear)
    await new Promise(r => setTimeout(r, 0));

    const parsed = parseInput(searchText);
    if (parsed.type === 'filter') {
      specManager.addFilter({
        column: parsed.column,
        operator: parsed.operator === '~' ? 'LIKE' : parsed.operator,
        value: parsed.value,
        enabled: true
      });
    } else {
      // Full-text search across all string columns
      const textColumns = schema.columns
        .filter(c => c.type === 'string')
        .map(c => c.name);

      if (textColumns.length > 0) {
        specManager.addFilter({
          columns: textColumns,
          column: 'Any', // Display label
          operator: 'ILIKE',
          value: parsed.value,
          enabled: true,
          isFulltext: true
        });
      }
    }

    setSearchText('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Backspace' && !searchText && filterTokens.length > 0) {
      const lastToken = filterTokens[filterTokens.length - 1];
      removeFilterToken(lastToken);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <div className="search-input-wrapper">
        {filterTokens.map((token, index) => (
          <button
            type="button"
            key={`${token.column}-${token.value}-${index}`}
            className="search-token"
            onClick={() => handleTokenEdit(token)}
            title="Click to edit"
          >
            <span className="search-token-key">{token.column}</span>
            <span className="search-token-value">{token.operator !== '=' ? token.operator : ''}{token.value}</span>
            <span
              className="search-token-remove"
              onClick={(event) => {
                event.stopPropagation();
                removeFilterToken(token);
              }}
            >
              ×
            </span>
          </button>
        ))}
        <input
          type="text"
          placeholder="Search: 'Layer:Semantic' or full-text..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input"
          disabled={isWaiting}
        />
        {isWaiting && (
         <div className="search-waiting-overlay">
           <div className="search-spinner"></div>
           Analyzing...
         </div>
        )}
      </div>
      <button type="submit" className="search-btn" disabled={isWaiting}>🔍</button>
    </form>
  );
}

export default SearchBar;
