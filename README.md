# PHOS - Data Discovery Browser

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Modern faceted browsing interface for exploring structured datasets with a spec-driven architecture.

## Usage

### 🐳 Docker (Quick Start)

**Option 1: Analyze a local folder (Recommended)**
```bash
# Provide a folder containing your data (e.g. data.json) and optional spec (e.g. data.spec.json)
docker run -p 8080:80 \
  -v $(pwd)/my-data-folder:/usr/share/nginx/html/data \
  ghcr.io/jordanauge/phos:latest
```
*Phos will automatically detect the first JSON or CSV file in the folder.*

**Option 2: Explicit file selection**
```bash
docker run -p 8080:80 \
  -v $(pwd)/my-data-folder:/usr/share/nginx/html/data \
  -e DATA_FILE=my-specific-file.csv \
  ghcr.io/jordanauge/phos:latest
```

> **Note**: Edits made in the browser are not automatically saved to your local file. Use the **Save Project (Data + Spec)** button to download your changes.

**Option 3: Analyze a remote URL**
```bash
docker run -p 8080:80 \
  -e DATA_URL=https://raw.githubusercontent.com/vega/vega-datasets/master/data/cars.json \
  ghcr.io/jordanauge/phos:latest
```

Open [http://localhost:8080](http://localhost:8080) to explore your data.

### 🌐 Web Demo

A live read-only demo is available at [https://jordanauge.github.io/phos/](https://jordanauge.github.io/phos/).

## Features

### 🎯 Core Capabilities

- **Spec-Driven Architecture**: All UI state serializable as JSON
  - Import/Export configurations
  - Save and share presets
  - Version control your data views

- **Multi-Level Grouping**: Hierarchical data organization
  - Stack multiple grouping levels (e.g., Layer > Scope > Type)
  - Drag to reorder grouping priority
  - Visual level indicators

- **Advanced Filtering**
  - Faceted filters by data type (Text, Numbers, Dates, etc.)
  - Multiple filter combinations
  - Enable/disable filters without removing them

- **Multiple View Modes**
  - **Grid View**: Sortable table with column selection
  - **Hierarchical View**: Tree-based grouped navigation
  - **Graph View**: D3 force-directed network visualization
  - View availability warnings when data is missing required fields

- **Column Management**
  - Show/hide columns
  - Sticky headers for long lists

### 🔌 Extensibility

- **Pluggable Providers**: Connect any data source
  - Built-in: `NativeArrayProvider` (JSON/CSV)
  - Optional: `DuckDBProvider` (HTTP service), `DuckDBWasmProvider` (in-browser)
  - Provider selection auto-detects by file extension with manual overrides

- **Spec System**: JSON-based configuration

## 🚀 Deployment & Usage

### Docker (Quick Start)
Run PHOS with your own data in seconds:

```bash
# Organize your data
mkdir -p my-data
cp your-data.json my-data/data.json
echo '{"dataSource": {"type": "native", "url": "./data.json"}}' > my-data/settings.json

# Run container mounting your data
docker run -p 8080:80 \
  -v $(pwd)/my-data:/usr/share/nginx/html/data \
  ghcr.io/your-username/phos:latest
```

See [Deployment Guide](docs/deployment.md) for full details on:
- Local Development
- Custom Data Mounting
- Static Hosting (GitHub Pages)

## Quick Start (Development)

```bash
npm install    # Install dependencies
npm run dev    # Start development server
npm run build  # Build for production
```

Open the URL printed by Vite in your terminal output.

## Usage

### Basic Workflow

1. **Load Data**: App loads `src/data/metrics.json` by default
2. **Filter**: Use sidebar faceted filters to narrow results
3. **Group**: Stack multiple grouping levels (Layer > Scope > Type)
4. **Visualize**: Switch between Grid/Hierarchical/Graph views
5. **Export**: Save configuration as JSON preset
6. **Data Source**: Use Settings → Data source to override provider + config

## Open-Source Comparison

See the design and feature comparison in [`docs/opensource-comparison.md`](./docs/opensource-comparison.md).

### Import/Export Specs

- **💾 Export Spec**: Downloads current configuration as JSON
- **📂 Import Spec**: Load saved spec from JSON file
- **⭐ Save Preset**: Save current state for quick access

### Multi-Level Grouping Example

```
L1: Layer (Semantic, Symbolic, Governance)
  L2: Scope (Session, Span, Agent)
    L3: Implementation Type (Geometric, LLMaaJ, Statistical)
```

## Architecture

```
src/
├── core/
│   └── SpecManager.js          # State management + spec serialization
├── providers/
│   └── NativeArrayProvider.js  # Data provider implementation
├── components/
│   ├── Sidebar.jsx             # Filters + Presets
│   ├── Toolbar.jsx             # Controls + Multi-level grouping
│   ├── SpecControls.jsx        # Import/Export/Save
│   ├── MultiLevelGrouping.jsx  # Hierarchical grouping UI
│   └── views/
│       ├── GridView.jsx
│       ├── HierarchicalView.jsx
│       └── GraphView.jsx
└── data/
    └── metrics.json            # Sample dataset
```

## Spec Format

```json
{
  "version": "1.0.0",
  "dataSource": { "type": "file", "path": "./data.json" },
  "settings": {
    "dataSource": { "mode": "auto" },
    "plugins": { "providers": ["native"], "backends": ["native"], "views": ["grid"] }
  },
  "state": {
    "filters": [...],
    "groupBy": "Layer",
    "visibleColumns": [...],
    "activeView": "hierarchical",
    "hiddenFilters": ["Name", "Description"],
    "hiddenColumns": []
  },
  "presets": [
    {
      "name": "Quality Metrics",
      "groupBy": "Layer",
      "filters": [{"column": "Score Type", "operator": "=", "value": "Quality"}]
    }
  ]
}
```

### Configuration Options

- **`hiddenFilters`**: Array of column names to hide from filter sidebar
- **`hiddenColumns`**: Array of column names to hide from column picker
- **`visibleColumns`**: Array of columns shown by default in grid view
- **`filterCategories`**: Predefined categories for grouping filters
- **`settings.dataSource`**: Auto mapping or provider override with config
- **`settings.plugins`**: Enable/disable providers, backends, and views

### Column Metadata

Each column can be marked read-only in metadata:

```json
"metadata": {
  "columns": {
    "Score Type": { "readOnly": true }
  }
}
```

## Limitations

- **DuckDB HTTP**: Requires a running DuckDB service with a query endpoint.
- **DuckDB WASM**: Runs fully in-browser and can be memory intensive on large datasets.

## Development

### Adding a Custom Provider

```javascript
class MyProvider {
  async load(data) { /* Load data */ }
  async query(transform) { /* Apply filters/sort */ }
  async getSchema() { /* Return column metadata */ }
  async getUniqueValues(column) { /* For filter dropdowns */ }
}
```

### Adding a Custom View

```javascript
// src/components/views/MyView.jsx
function MyView({ result, spec, schema }) {
  return <div>Custom visualization</div>;
}

// Register in DataView.jsx
case 'myview':
  return <MyView result={result} spec={spec} schema={schema} />;
```

## Testing

```bash
npm test        # Run all tests
npm run test:ui # Interactive test UI
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](./LICENSE)
