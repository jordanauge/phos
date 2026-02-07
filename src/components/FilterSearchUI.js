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
 * Filter Search UI Component (Observable Framework compatible)
 * Renders the advanced filter search bar with autocompletion
 */

import { FilterSearch } from './FilterSearch.js';
import { html } from 'npm:htl';

export function renderFilterSearchBar(schema, provider, specManager, state) {
  const filterSearch = new FilterSearch(schema, provider, specManager);
  
  // Initialize from current filters
  const currentFilters = state.spec.state.filters.filter(f => !f.isFulltext);
  filterSearch.filterBlocks = currentFilters.map(f => ({
    type: 'filter',
    column: f.column,
    operator: f.operator,
    value: f.value,
    raw: `${f.column}:${f.operator === '=' ? '' : f.operator}${f.value}`
  }));

  let inputValue = '';
  let suggestions = [];
  let selectedSuggestion = 0;
  let showSuggestions = false;

  async function handleInput(event) {
    inputValue = event.target.value;
    const cursorPos = event.target.selectionStart;
    
    if (inputValue.trim()) {
      suggestions = await filterSearch.getSuggestions(inputValue, cursorPos);
      selectedSuggestion = 0;
      showSuggestions = suggestions.length > 0;
    } else {
      showSuggestions = false;
    }
    
    // Trigger re-render
    event.target.dispatchEvent(new CustomEvent('update'));
  }

  function handleKeyDown(event) {
    if (!showSuggestions) {
      if (event.key === 'Enter') {
        applyInput();
      }
      return;
    }

    switch(event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedSuggestion = Math.min(selectedSuggestion + 1, suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedSuggestion = Math.max(selectedSuggestion - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (suggestions[selectedSuggestion]) {
          applySuggestion(suggestions[selectedSuggestion]);
        }
        break;
      case 'Escape':
        showSuggestions = false;
        break;
    }
  }

  function applySuggestion(suggestion) {
    const input = document.querySelector('.filter-search-input');
    if (!input) return;

    const beforeCursor = inputValue.substring(0, input.selectionStart);
    const afterCursor = inputValue.substring(input.selectionStart);
    
    // Replace the partial word/value with the suggestion
    let newValue;
    if (suggestion.type === 'column') {
      const wordMatch = beforeCursor.match(/(\w*)$/);
      const beforeWord = beforeCursor.substring(0, beforeCursor.length - wordMatch[0].length);
      newValue = beforeWord + suggestion.insertText + afterCursor;
    } else if (suggestion.type === 'value') {
      const valueMatch = beforeCursor.match(/(\w+):([^:\s]*)$/);
      const beforeValue = beforeCursor.substring(0, beforeCursor.length - valueMatch[2].length);
      newValue = beforeValue + suggestion.insertText + ' ' + afterCursor;
    }

    input.value = newValue;
    inputValue = newValue;
    showSuggestions = false;
    
    // Trigger input event to update state
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyInput() {
    if (!inputValue.trim()) return;

    const blocks = filterSearch.parseExpression(inputValue);
    filterSearch.filterBlocks = [...filterSearch.filterBlocks, ...blocks];
    filterSearch.applyBlocks(filterSearch.filterBlocks);
    
    inputValue = '';
    const input = document.querySelector('.filter-search-input');
    if (input) input.value = '';
  }

  function removeBlock(index) {
    filterSearch.removeBlock(index);
  }

  function handlePaste(event) {
    const pastedText = event.clipboardData.getData('text');
    filterSearch.handlePaste(pastedText);
    event.preventDefault();
  }

  function handleCopy() {
    const text = filterSearch.handleCopy();
    navigator.clipboard.writeText(text);
  }

  function clearBlocks() {
    filterSearch.filterBlocks = [];
    filterSearch.applyBlocks([]);
  }

  return html`<div class="filter-search-container">
    <div class="filter-search-header">
      <label>🔍 Filter Search</label>
      <div class="filter-search-help"><span title="Type 'column:value' or just search text. Use operators like >50000, !=NY, ~John">?</span></div>
    </div>
    <div class="filter-blocks">
      ${filterSearch.filterBlocks.map((block, idx) => html`<div class="filter-block" draggable="true">
          <span class="filter-block-content">
            ${block.type === 'filter' ? html`<strong>${block.column}</strong>: ${block.operator !== '=' ? block.operator : ''}${block.value}` : block.value}
          </span>
          <button class="filter-block-remove" onclick=${() => removeBlock(idx)} title="Remove filter">×</button>
        </div>`)}
    </div>
    <div class="filter-search-input-wrapper">
      <input type="text" class="filter-search-input" placeholder="Type column:value or search text..." value=${inputValue} oninput=${handleInput} onkeydown=${handleKeyDown} onpaste=${handlePaste}/>
      ${showSuggestions ? html`<div class="filter-search-suggestions">
          ${suggestions.map((suggestion, idx) => html`<div class=${'suggestion-item' + (idx === selectedSuggestion ? ' selected' : '')} onclick=${() => applySuggestion(suggestion)}>${suggestion.type === 'column' ? '🔤 ' : ''}${suggestion.label}</div>`)}
        </div>` : ''}
    </div>
    <div class="filter-search-actions">
      <button onclick=${applyInput} class="apply-btn">Add</button>
      <button onclick=${handleCopy} class="copy-btn" title="Copy all filters">📋 Copy</button>
      <button onclick=${clearBlocks} class="clear-btn">Clear All</button>
    </div>
  </div>`;
}
