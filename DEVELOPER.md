# Data Discovery Browser - Developer Guide

Technical documentation for contributing to and extending the Data Discovery Browser.

## Architecture

### Core Concepts

The browser follows a **spec-driven architecture** where all UI state is serializable JSON:

```
User Input → SpecManager (State) → Provider (Query) → UI (Render)
                ↓
            Listeners (Reactive Updates)
```

### Components

#### 1. SpecManager (`src/core/SpecManager.js`)

Central state manager that stores all configuration as JSON.

```js
class SpecManager {
  spec: {
    version: string,
    dataSource: { type, data },
    provider: { type },
    state: {
      filters: Filter[],
      sort: Sort[],
      pagination: { page, pageSize },
      groupBy: string,
      visibleColumns: string[],
      columnOrder: string[],
      filterCategories: object,
      activeView: 'grid' | 'hierarchical' | 'graph'
    },
    presets: Preset[]
  }
}
```

**Key Methods:**
- `getSpec()` - Get immutable copy of current spec
- `updateState(updates)` - Update state and notify listeners
- `subscribe(listener)` - Listen for state changes
- `query()` - Execute query with current filters/sort/pagination
- `toJSON()` / `fromJSON()` - Serialize/deserialize state

#### 2. DataProvider Interface

Abstract interface for data sources. All providers must implement:

```js
interface DataProvider {
  async load(input: any): Promise<void>
  async query(transform: TransformState): Promise<QueryResult>
  async getUniqueValues(column: string): Promise<any[]>
  async getSchema(): Promise<Schema>
}
```

**Implementations:**
- **NativeArrayProvider** (`src/providers/NativeArrayProvider.js`) - In-memory JavaScript arrays
- **DuckDBProvider** (`src/providers/DuckDBProvider.js`) - SQL queries via DuckDB-WASM

#### 3. Filter Components

**FilterSearch** (`src/components/FilterSearch.js`)
- Parses `column:value` expressions
- Handles operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `~` (LIKE)
- Provides autocompletion
- Serializes/deserializes filter expressions

**ColumnReorder** (`src/components/ColumnReorder.js`)
- Manages column order via drag & drop
- Persists order in spec state
- Handles visible column filtering

**UI Components:**
- `FilterSearchUI.js` - Renders search bar with autocomplete
- `FilterCategoriesUI.js` - Renders categorized filter dropdowns
- `ColumnPickerUI.js` - Renders draggable column list

### Data Flow

1. **User Action** (type filter, click sort, etc.)
2. **SpecManager.updateState()** - Update spec
3. **Notify Listeners** - All subscribed components notified
4. **Provider.query()** - Execute query with transform state
5. **UI Re-render** - Observable Framework reactivity triggers update

## Adding New Features

### Add a New Filter Operator

1. **Update FilterSearch parser:**

```js
// src/components/FilterSearch.js
normalizeOperator(op) {
  const map = {
    // ... existing operators
    'BETWEEN': 'BETWEEN',  // Add new
  };
  return map[op] || '=';
}

parseExpression(text) {
  // Add regex for BETWEEN syntax
  // e.g., "salary:BETWEEN:50000:80000"
}
```

2. **Update Provider query logic:**

```js
// src/providers/NativeArrayProvider.js
applyFilter(data, filter) {
  // ... existing cases
  case 'BETWEEN':
    const [min, max] = filter.value.split(':');
    return data.filter(row => 
      row[filter.column] >= min && row[filter.column] <= max
    );
}
```

3. **Add tests:**

```js
// tests/components/FilterSearch.test.js
it('should parse BETWEEN operator', () => {
  const blocks = filterSearch.parseExpression('salary:BETWEEN:50000:80000');
  expect(blocks[0].operator).toBe('BETWEEN');
});
```

4. **Document in USER_GUIDE.md**

### Add a New View Mode

1. **Update SpecManager state:**

```js
// src/core/SpecManager.js
state: {
  activeView: 'grid' | 'hierarchical' | 'graph' | 'timeline'  // Add 'timeline'
}
```

2. **Create view renderer:**

```js
// src/index.md
function renderTimelineView(result, spec, schema) {
  // Build timeline from date columns
  return html`<div class="timeline">...</div>`;
}
```

3. **Add view selector button:**

```html
<button onclick=${() => specManager.setActiveView('timeline')}>
  📅 Timeline
</button>
```

4. **Add to renderActiveView switch:**

```js
function renderActiveView(viewName, result, spec, schema) {
  switch(viewName) {
    case 'timeline':
      return renderTimelineView(result, spec, schema);
    // ... other cases
  }
}
```

### Add a New Data Provider

1. **Implement DataProvider interface:**

```js
// src/providers/PostgreSQLProvider.js
export class PostgreSQLProvider {
  constructor(connectionString) {
    this.connection = connectionString;
    this.client = null;
  }

  async load(query) {
    // Connect to PostgreSQL
    // Execute initial query
  }

  async query(transform) {
    // Convert transform to SQL WHERE/ORDER/LIMIT
    // Execute query
    // Return { data, total, schema }
  }

  async getUniqueValues(column) {
    // SELECT DISTINCT column FROM table
  }

  async getSchema() {
    // Query information_schema
    // Return { columns: [...] }
  }
}
```

2. **Register in SpecManager:**

```js
const specManager = new SpecManager({
  provider: { type: 'postgresql', connection: 'postgres://...' }
});
```

3. **Add tests:**

```js
// tests/providers/PostgreSQLProvider.test.js
describe('PostgreSQLProvider', () => {
  it('should connect and query', async () => {
    const provider = new PostgreSQLProvider(mockConnection);
    await provider.load('SELECT * FROM users');
    const result = await provider.query({ filters: [] });
    expect(result.data).toHaveLength(10);
  });
});
```

## Testing

### Run Tests

```bash
make test           # Run all tests
make test-watch     # Watch mode
make test-ui        # Interactive UI
make coverage       # Coverage report
```

### Test Structure

```
tests/
├── core/                    # Core module tests
├── providers/               # Data provider tests
│   ├── NativeArrayProvider.test.js
│   └── DuckDBProvider.test.js
├── components/              # UI component tests
│   ├── FilterSearch.test.js
│   └── ColumnReorder.test.js
├── integration.test.js      # End-to-end flows
├── regression.test.js       # Bug prevention
└── setup.js                 # Test utilities
```

### Writing Tests

**Unit Test Example:**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { FilterSearch } from '../src/components/FilterSearch.js';

describe('FilterSearch', () => {
  let filterSearch;

  beforeEach(() => {
    const mockSchema = { columns: [...] };
    const mockProvider = { getUniqueValues: async () => [...] };
    const mockSpecManager = { addFilter: () => {} };
    
    filterSearch = new FilterSearch(mockSchema, mockProvider, mockSpecManager);
  });

  it('should parse filter expression', () => {
    const blocks = filterSearch.parseExpression('dept:Engineering');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].column).toBe('dept');
  });
});
```

**Integration Test Example:**

```js
it('should filter and sort data end-to-end', async () => {
  // Setup
  const provider = new NativeArrayProvider();
  await provider.load(testData);
  const specManager = new SpecManager();
  specManager.setProvider(provider);

  // Apply filter
  specManager.addFilter({ column: 'salary', operator: '>', value: 50000 });
  
  // Apply sort
  specManager.setSort('name', 'asc');

  // Query
  const result = await specManager.query();

  // Assert
  expect(result.data.every(d => d.salary > 50000)).toBe(true);
  expect(result.data[0].name <= result.data[1].name).toBe(true);
});
```

## Code Style

### General Guidelines

- Use ES6+ features (classes, async/await, destructuring)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused (< 50 lines)

### JSDoc Format

```js
/**
 * Parse filter expression into blocks
 * 
 * @param {string} text - Filter expression (e.g., "dept:Eng salary:>50k")
 * @returns {FilterBlock[]} Array of parsed filter blocks
 * 
 * @example
 * const blocks = parseExpression('department:Engineering');
 * // Returns: [{ type: 'filter', column: 'department', operator: '=', value: 'Engineering' }]
 */
parseExpression(text) {
  // ...
}
```

### File Organization

```
src/
├── core/               # Core business logic
│   └── SpecManager.js
├── providers/          # Data adapters
│   ├── NativeArrayProvider.js
│   └── DuckDBProvider.js
├── components/         # UI components
│   ├── FilterSearch.js
│   ├── FilterSearchUI.js
│   └── filter-components.css
├── data/              # Example datasets
└── index.md           # Main page
```

## Performance Optimization

### Large Datasets

For datasets > 10,000 rows:

1. Use **DuckDBProvider** (SQL engine)
2. Enable **pagination** (default: 50 rows)
3. **Lazy-load** unique values:

```js
async getUniqueValues(column) {
  // Only fetch first 1000 unique values
  return await db.query(`
    SELECT DISTINCT ${column} 
    FROM data 
    LIMIT 1000
  `);
}
```

4. **Debounce** filter input:

```js
let timeout;
function handleInput(event) {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    applyFilters(event.target.value);
  }, 300);
}
```

### Rendering Optimization

- Use **virtual scrolling** for large tables (not yet implemented)
- Limit **visible columns** (fewer DOM nodes)
- **Memoize** expensive computations:

```js
const memoizedSchema = useMemo(() => 
  provider.getSchema(), 
  [provider]
);
```

## Observable Framework Integration

This project uses [Observable Framework](https://observablehq.com/framework/) for reactive rendering.

### Key Concepts

**Reactive Cells:**
```js
// Data is reactive - updates trigger re-renders
const state = view(Generators.observe(notify => {
  const unsub = specManager.subscribe((spec) => {
    notify({ spec, result });
  });
  return unsub;
}));
```

**HTML Templating:**
```js
import { html } from 'npm:htl';

html`<div>${state.spec.activeView}</div>`
```

**File Attachments:**
```js
const file = FileAttachment("./data/metrics.json");
const text = await file.text();
```

## Deployment

### Build for Production

```bash
make build
```

Output in `dist/` directory.

### Deploy to Observable Cloud

```bash
make deploy
```

Or manually:
```bash
npm run deploy
```

### Self-Host

Serve the `dist/` folder with any static file server:

```bash
npx serve dist
# Or: python -m http.server -d dist
# Or: caddy file-server --root dist
```

## Contributing

### Development Workflow

1. **Fork** the repository
2. **Create branch**: `git checkout -b feature/my-feature`
3. **Make changes** and add tests
4. **Run tests**: `make test`
5. **Commit**: Follow conventional commits (e.g., `feat: add timeline view`)
6. **Push** and create **Pull Request**

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
- `feat(filters): add BETWEEN operator`
- `fix(provider): handle null values in getUniqueValues`
- `docs(api): document SpecManager methods`

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log/debugger statements
- [ ] JSDoc comments for public APIs
- [ ] Follows existing code style
- [ ] No breaking changes (or documented)

## Troubleshooting

### Common Issues

**Import errors in tests:**
- Check Vitest config alias resolution
- Use relative imports in test files
- Verify file exists and exports are correct

**State not updating:**
- Ensure `specManager.subscribe()` is called
- Check that state is wrapped in `view()`
- Verify `notifyListeners()` is called after updates

**Provider query fails:**
- Check filter operators match provider implementation
- Verify column names are correct
- Ensure data types match (number for numeric operators)

### Debug Mode

Enable verbose logging:

```js
const DEBUG = true;

if (DEBUG) console.log('Query:', transform);
const result = await provider.query(transform);
if (DEBUG) console.log('Result:', result);
```

## API Reference

### SpecManager API

See JSDoc in `src/core/SpecManager.js` for complete API.

### Provider API

See interface definition in documentation above.

### FilterSearch API

See `src/components/FilterSearch.js` for complete method list.

## Resources

- [Observable Framework Docs](https://observablehq.com/framework/)
- [D3.js Documentation](https://d3js.org/)
- [Vitest Documentation](https://vitest.dev/)
- [DuckDB-WASM](https://duckdb.org/docs/api/wasm/)

## License

[Your License Here]
