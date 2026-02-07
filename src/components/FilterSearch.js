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
 * Advanced Filter Search Component
 * 
 * Features:
 * - Full-text search with key:value syntax
 * - Autocompletion for columns and values
 * - Visual filter blocks (chips/tags)
 * - Copy/paste support for filter expressions
 * - Drag to reorder blocks
 */

export class FilterSearch {
  constructor(schema, provider, specManager) {
    this.schema = schema;
    this.provider = provider;
    this.specManager = specManager;
    this.inputValue = '';
    this.cursorPosition = 0;
    this.suggestions = [];
    this.selectedSuggestion = 0;
    this.filterBlocks = [];
    this.draggedBlock = null;
  }

  /**
   * Parse filter expression into blocks
   * Format: "key:value" or "full text search"
   * Examples:
   *   - "department:Engineering"
   *   - "salary:>50000"
   *   - "name:Alice location:SF"
   *   - "engineering" (full-text search)
   */
  parseExpression(text) {
    const blocks = [];
    const regex = /(\w+):([^\s]+)|([^\s:]+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match[1] && match[2]) {
        // key:value format
        const column = match[1];
        const value = match[2];
        
        // Parse operators from value (e.g., ">50000", "!=Engineering")
        const operatorMatch = value.match(/^(>=|<=|!=|=|>|<|~|LIKE|IN)?(.*)$/);
        const operator = operatorMatch[1] || '=';
        const cleanValue = operatorMatch[2];

        blocks.push({
          type: 'filter',
          column,
          operator: this.normalizeOperator(operator),
          value: cleanValue,
          raw: match[0]
        });
      } else if (match[3]) {
        // Full-text search
        blocks.push({
          type: 'fulltext',
          value: match[3],
          raw: match[0]
        });
      }
    }

    return blocks;
  }

  /**
   * Normalize operator syntax
   */
  normalizeOperator(op) {
    const map = {
      '=': '=',
      '==': '=',
      '!=': '!=',
      '<>': '!=',
      '>': '>',
      '<': '<',
      '>=': '>=',
      '<=': '<=',
      '~': 'LIKE',
      'LIKE': 'LIKE',
      'IN': 'IN'
    };
    return map[op] || '=';
  }

  /**
   * Serialize blocks back to text
   */
  serializeBlocks(blocks) {
    return blocks.map(block => {
      if (block.type === 'filter') {
        const op = block.operator === '=' ? '' : block.operator;
        return `${block.column}:${op}${block.value}`;
      }
      return block.value;
    }).join(' ');
  }

  /**
   * Get autocompletion suggestions based on cursor position
   */
  async getSuggestions(text, cursorPos) {
    // Detect what we're completing
    const beforeCursor = text.substring(0, cursorPos);
    const colonMatch = beforeCursor.match(/(\w+):([^:\s]*)$/);
    const wordMatch = beforeCursor.match(/(\w+)$/);

    if (colonMatch) {
      // Completing value after "column:"
      const column = colonMatch[1];
      const partial = colonMatch[2];
      return await this.getValueSuggestions(column, partial);
    } else if (wordMatch) {
      // Completing column name or full-text
      const partial = wordMatch[1];
      return this.getColumnSuggestions(partial);
    }

    return [];
  }

  /**
   * Get column name suggestions
   */
  getColumnSuggestions(partial) {
    const lowerPartial = partial.toLowerCase();
    return this.schema.columns
      .filter(col => col.name.toLowerCase().includes(lowerPartial))
      .map(col => ({
        type: 'column',
        value: col.name,
        label: `${col.name} (${col.type})`,
        insertText: `${col.name}:`
      }));
  }

  /**
   * Get value suggestions for a column
   */
  async getValueSuggestions(column, partial) {
    try {
      const uniqueValues = await this.provider.getUniqueValues(column);
      const lowerPartial = partial.toLowerCase();
      
      const filtered = uniqueValues
        .filter(v => String(v).toLowerCase().includes(lowerPartial))
        .slice(0, 20); // Limit to 20 suggestions

      return filtered.map(value => ({
        type: 'value',
        value: String(value),
        label: String(value),
        insertText: String(value)
      }));
    } catch (error) {
      console.error(`Failed to get values for ${column}:`, error);
      return [];
    }
  }

  /**
   * Apply filter blocks to spec manager
   */
  applyBlocks(blocks) {
    // Clear existing filters
    this.specManager.spec.state.filters = [];

    // Add new filters from blocks
    blocks.forEach(block => {
      if (block.type === 'filter') {
        this.specManager.addFilter({
          column: block.column,
          operator: block.operator,
          value: block.value,
          enabled: true
        });
      } else if (block.type === 'fulltext') {
        // Full-text search: add filters for all text columns
        const textColumns = this.schema.columns.filter(c => c.type === 'string');
        textColumns.forEach(col => {
          this.specManager.addFilter({
            column: col.name,
            operator: 'LIKE',
            value: `%${block.value}%`,
            enabled: true,
            isFulltext: true
          });
        });
      }
    });
  }

  /**
   * Handle paste event - parse and create blocks
   */
  handlePaste(pastedText) {
    const blocks = this.parseExpression(pastedText);
    this.filterBlocks = [...this.filterBlocks, ...blocks];
    this.applyBlocks(this.filterBlocks);
  }

  /**
   * Handle copy event - serialize blocks
   */
  handleCopy() {
    return this.serializeBlocks(this.filterBlocks);
  }

  /**
   * Remove a filter block
   */
  removeBlock(index) {
    this.filterBlocks.splice(index, 1);
    this.applyBlocks(this.filterBlocks);
  }

  /**
   * Reorder blocks via drag & drop
   */
  reorderBlocks(fromIndex, toIndex) {
    const block = this.filterBlocks.splice(fromIndex, 1)[0];
    this.filterBlocks.splice(toIndex, 0, block);
    this.applyBlocks(this.filterBlocks);
  }

  /**
   * Group filters by category (column type or custom grouping)
   */
  getFilterCategories() {
    const categories = new Map();
    
    this.schema.columns.forEach(col => {
      const category = col.category || col.type || 'Other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(col);
    });

    return categories;
  }
}
