# Data Discovery Browser - User Guide

A pluggable, spec-driven data exploration tool for structured datasets.

## Quick Start

### Installation

```bash
# Using Make (recommended)
make setup

# Or manually
npm install
```

### Run Development Server

```bash
make dev
# Or: npm run dev
```

Open the URL printed by Vite in your terminal.

### Docker Usage

**Mounting a Data Folder (Recommended)**

```bash
docker run -p 8080:80 \
  -v $(pwd)/my-data:/usr/share/nginx/html/data \
  ghcr.io/jordanauge/phos:latest
```
This serves all files in `my-data`. PHOS will automatically load the first dataset found.
If you have a customized `myset.spec.json` alongside `myset.json` in that folder, it will be loaded automatically.

**Persistence**: 
Changes are in-memory. To save your work:
1. Click the **☰** menu in the toolbar.
2. Select **💾 Save Project (Data + Spec)**.
3. This downloads both your modified data (JSON) and configuration (spec).
4. Save these files back to your local folder to persist changes for next time.

### Load Your Data (Development)

### 1. Multiple View Modes

- **Grid View** - Table with sortable columns
- **Hierarchical View** - Expandable tree structure (group by any column)
- **Graph View** - Force-directed network visualization

### 2. Advanced Filter Search

Type filters using `column:value` syntax:

```
department:Engineering
salary:>50000
location:SF name:~John
```

**Supported Operators:**
- `=` Equal (default)
- `!=` Not equal
- `>`, `<`, `>=`, `<=` Numeric comparisons
- `~` LIKE (contains text)

**Full-text Search:** Just type words without colons to search all text columns.

**Autocompletion:** 
- Start typing a column name → get suggestions
- Type `column:` → get value suggestions
- Use ↑/↓ to navigate, Enter to select

**Filter Blocks:**
- Active filters appear as colored chips
- Click × to remove
- Drag to reorder
- Click "📋 Copy" to copy all filters
- Paste filter expressions directly

### 3. Column Management

**Reorder Columns:**
- Drag column headers to reorder
- Click ↺ to reset to default order

**Show/Hide Columns:**
- Use the column picker to toggle visibility
- Drag columns in picker to reorder

**Filter by Category:**
Filters are automatically grouped:
- 📝 Text columns
- 🔢 Numbers
- ✓ Yes/No (boolean)
- 📅 Dates
- 🌳 Hierarchical

### 4. Presets

Save and reuse common configurations:

```js
const specManager = new SpecManager({
  presets: [
    { name: 'By Department', groupBy: 'department' },
    { name: 'High Earners', filters: [{ column: 'salary', operator: '>', value: 80000 }] }
  ]
});
```

### 5. Export State

Use **Save Spec** in the toolbar to download the current configuration as JSON.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Apply filter expression |
| **↑/↓** | Navigate autocomplete |
| **Escape** | Close autocomplete |
| **Ctrl+C** | Copy filters |
| **Ctrl+V** | Paste filters |

## Data Providers

### Native Array Provider (Built-in)

Works with CSV files and JavaScript arrays:

```js
import { NativeArrayProvider } from './providers/NativeArrayProvider.js';

const provider = new NativeArrayProvider();

// From CSV
await provider.load(csvText);

// From array
await provider.load([
  { name: 'Alice', dept: 'Engineering', salary: 75000 },
  { name: 'Bob', dept: 'Sales', salary: 65000 }
]);
```

### DuckDB Provider (HTTP)

Use **Settings → Data source → Provider override** to configure:

- **Provider**: `duckdb`
- **Endpoint**: DuckDB query service URL
- **Table**: Table name to query

### DuckDB WASM Provider (In-Browser)

Use **Settings → Data source → Provider override** with:

- **Provider**: `duckdb-wasm`
- **Table**: Table name (defaults to `data`)

## Example Data

The project includes example datasets:

- `src/data/metrics.json` - Sample metrics data
- `src/data/metrics.spec.json` - Spec configuration for metrics

## Configuration

### Spec Structure

```json
{
  "version": "1.0.0",
  "dataSource": { "type": "file", "path": "./data/metrics.json" },
  "provider": { "type": "native" },
  "settings": {
    "dataSource": { "mode": "auto" }
  },
  "state": {
    "filters": [
      { "column": "department", "operator": "=", "value": "Engineering", "enabled": true }
    ],
    "sort": [{ "column": "salary", "direction": "desc" }],
    "pagination": { "page": 1, "pageSize": 50 },
    "groupBy": null,
    "visibleColumns": ["name", "department", "salary"],
    "columnOrder": ["name", "department", "salary"],
    "activeView": "grid"
  },
  "presets": [
    { "name": "By Department", "groupBy": "department" }
  ]
}
```

### Schema Detection

The provider automatically detects:
- **Column types**: string, number, boolean, date
- **Hierarchies**: Columns with `>` delimiter (e.g., "Engineering > Backend")
- **Categories**: Group related columns

### Custom Categories

```js
const schema = {
  columns: [
    { name: 'name', type: 'string', category: 'Personal Info' },
    { name: 'email', type: 'string', category: 'Personal Info' },
    { name: 'salary', type: 'number', category: 'Compensation' }
  ]
};
```

## Read-Only Columns

Use the ⓘ tooltip on a column header and toggle **Read-only column**. This writes to the spec:

```json
"metadata": {
  "columns": {
    "Score Type": { "readOnly": true }
  }
}
```

## Troubleshooting

**Issue: Data not loading**
- Check file path in FileAttachment
- Verify CSV format (headers in first row)
- Check browser console for errors

**Issue: Filters not working**
- Ensure column names match exactly (case-sensitive)
- Check operator syntax (`>`, not `greater than`)
- Verify data types (numeric operators on number columns)

**Issue: Autocomplete not showing**
- Wait for provider to load data
- Check that `getUniqueValues()` returns array
- Verify async/await usage

**Issue: Columns not reordering**
- Ensure `draggable="true"` on headers
- Check that SpecManager is properly initialized
- Verify state is reactive (using Observable's `view()`)

## Performance Tips

- Use DuckDB provider for datasets > 10,000 rows
- Limit visible columns for faster rendering
- Enable pagination (default: 50 rows per page)
- Use column types for optimized filtering
- Consider lazy-loading unique values for large columns

## Next Steps

- Read [Developer Guide](./DEVELOPER.md) for API documentation
- Check [Integration Example](./docs/integration-example.md) for code samples
- Explore example datasets in `src/data/`
- Customize styles in `src/components/filter-components.css`

## Support

- Report issues on GitHub
- Check existing issues for solutions
- Contribute improvements via pull requests
