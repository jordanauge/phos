// Test setup file
// Configure global test utilities and mocks

// Mock FileAttachment for Observable Framework
global.FileAttachment = (path) => ({
  text: async () => {
    throw new Error(`File not found: ${path}`);
  },
  json: async () => {
    if (path.includes('metrics.spec.json')) {
      return {
        version: '1.0.0',
        dataSource: { type: 'file', path: './data/metrics.json' },
        provider: { type: 'native' },
        state: {
          filters: [],
          sort: [],
          pagination: { page: 1, pageSize: 50 },
          groupBy: null,
          visibleColumns: [],
          activeView: 'grid'
        },
        presets: []
      };
    }
    if (path.includes('metrics.json')) {
      return [];
    }
    throw new Error(`File not found: ${path}`);
  }
});

// Mock console errors for cleaner test output
global.console.error = (...args) => {
  // Only show errors that are not expected test errors
  const message = args[0]?.toString() || '';
  if (!message.includes('expected') && !message.includes('test')) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
};
