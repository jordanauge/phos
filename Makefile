.PHONY: help install dev build test clean run preview deploy

# Default target
help:
	@echo "Data Discovery Browser - Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Run development server"
	@echo "  make build      - Build for production"
	@echo "  make test       - Run all tests"
	@echo "  make test-watch - Run tests in watch mode"
	@echo "  make test-ui    - Run tests with UI"
	@echo "  make coverage   - Run tests with coverage"
	@echo "  make clean      - Remove build artifacts and cache"
	@echo "  make deploy     - Deploy to Observable Cloud"
	@echo "  make data       - Copy example data files"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Run development server
dev: install
	@echo "Starting development server..."
	npm run dev

# Alternative name for dev
run: dev

# Build for production
build: install
	@echo "Building for production..."
	npm run build

# Preview production build
preview: build
	@echo "Previewing production build..."
	npx serve dist

# Deploy to Observable Cloud
deploy: build
	@echo "Deploying to Observable Cloud..."
	npm run deploy

# Run tests
test:
	@echo "Running tests..."
	npm test

# Run tests in watch mode
test-watch:
	@echo "Running tests in watch mode..."
	npm run test:watch

# Run tests with UI
test-ui:
	@echo "Running tests with UI..."
	npm run test:ui

# Run tests with coverage
coverage:
	@echo "Running tests with coverage..."
	npm run test:coverage

# Clean build artifacts and cache
clean:
	@echo "Cleaning build artifacts and cache..."
	rm -rf dist
	rm -rf .observablehq/cache
	rm -rf node_modules/.cache
	@echo "Clean complete"

# Deep clean (including node_modules)
clean-all: clean
	@echo "Removing node_modules..."
	rm -rf node_modules
	@echo "Deep clean complete"

# Copy example data files
data:
	@echo "Copying example data files..."
	@mkdir -p src/data
	@if [ -f ~/repos/papers/semantic-extraction/code/metric-explorer/data/metrics.json ]; then \
		cp ~/repos/papers/semantic-extraction/code/metric-explorer/data/metrics.json src/data/; \
		echo "✓ Copied metrics.json"; \
	else \
		echo "⚠ metrics.json not found at expected location"; \
	fi
	@echo "Data copy complete"

# Setup project (install + data)
setup: install data
	@echo "Setup complete! Run 'make dev' to start developing."

# Lint code (if you add a linter later)
lint:
	@echo "Linting not configured yet"

# Release helper (requires npm version to be updated first)
release: test build
	@echo "Creating release..."
	@if [ -z "$(version)" ]; then echo "Error: version argument required. Usage: make release version=1.0.0"; exit 1; fi
	git tag -a v$(version) -m "Release v$(version)"
	git push origin main --tags
	@echo "Release v$(version) created and pushed!"

# Format code (if you add a formatter later)
format:
	@echo "Code formatting not configured yet"
