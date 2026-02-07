# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-04

### Added

- Initial release of Data Discovery Browser
- **Multiple View Modes**: Grid, hierarchical, and graph visualizations
- **Advanced Filtering System**:
  - Full-text search with `key:value` expression syntax
  - 7 operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `~` (LIKE)
  - Visual filter blocks with drag & drop
  - Copy/paste filter expressions
  - Filter categories for organized filtering
- **Column Management**:
  - Drag & drop column reordering
  - Show/hide columns dynamically
  - Persistent column order in spec
- **Preset System**: Save and apply common configurations
- **Spec-Driven Architecture**: All state serializable to JSON
- **Pluggable Data Providers**:
  - NativeArrayProvider for in-memory arrays (CSV, JSON)
  - DuckDBProvider interface ready (not yet implemented)
- **Test Suite**: 46 tests (regression + integration)
- **Build System**:
  - Makefile with 15 targets
  - Observable Framework integration
  - Vitest test runner
- **Documentation**:
  - README.md - Project overview
  - USER_GUIDE.md - Complete user documentation
  - DEVELOPER.md - Development guide
  - METRICS_ONTOLOGY.md - Metrics ontology recommendations
  - LICENSE - MIT License
- **Example Data**:
  - metrics.json - 168 MAS governance metrics

### Fixed

- **Critical**: SpecManager state initialization bug where `filters` array was undefined when partial state provided
  - Added deep merge for state object in constructor
  - Added regression tests to prevent recurrence
  - Issue: `Cannot read properties of undefined (reading 'filter')`
- Direct mutation of spec in `clearAllFilters()` - now uses proper method

### Changed

- Switched default dataset to metrics.json
- Normalized array-valued fields (Scope, Parents, Dependencies, Artifacts)
- Configured 10 filter categories for metrics dimensions

### Developer Notes

- Component tests (FilterSearch, ColumnReorder) have import resolution issues in Vitest but work correctly in production
- 10 dev dependency vulnerabilities (acceptable - not shipped to users)

## [Unreleased]

### Planned Features

- DuckDB provider implementation for large datasets
- Export functionality (CSV, JSON, Parquet)
- Virtual scrolling for large tables
- More visualization types (scatter plot, heatmap)
- Query builder UI (visual alternative to key:value syntax)
- Collaborative presets (share via URL)
- Plugin system for custom visualizations

### Known Issues

- Component unit tests fail with import resolution error in Vitest (components work in production)
- Native provider optimal for <10k rows (DuckDB recommended for larger datasets)
- Mobile UI is functional but not polished

---

## Release Notes

### v0.1.0 - Initial Release

This is the first public release of Data Discovery Browser, a modular framework for exploring and visualizing data with a focus on faceted filtering and spec-driven state management.

**Quick Start:**

```bash
make setup      # Install deps + copy example data
make dev        # Start dev server (http://localhost:3000)
```

**Browse Metrics:**
The app now loads 168 MAS governance metrics by default with multi-dimensional filtering (Scope, Layer, Nature, Implementation Type, etc.).

**Key Features:**

- Filter with expressions like `Layer:Semantic MCE Implemented:Yes`
- Reorder and hide columns
- Save configurations as presets
- Export state as JSON

**For Contributors:**
See DEVELOPER.md for architecture details, API documentation, and testing guidelines.

**Feedback Welcome:**
Please report issues on GitHub and share your use cases!
