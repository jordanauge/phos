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
 * Register default view plugins used by the app.
 */
import React from 'react';
import GridView from '../components/views/GridView';
import HierarchicalView from '../components/views/HierarchicalView';
import GraphView from '../components/views/GraphView';
import { viewRegistry } from './ViewRegistry';

// Register built-in views for grid, hierarchical, and graph.
export function registerDefaultViews() {
  viewRegistry.register({
    id: 'grid',
    label: 'Grid',
    canRender: () => ({ available: true }),
    render: (props) => React.createElement(GridView, props)
  });

  viewRegistry.register({
    id: 'hierarchical',
    label: 'Hierarchical',
    canRender: ({ spec }) => {
      if (!spec?.state?.groupBy) {
        return { available: false, reason: 'Select a Group By column to enable.' };
      }
      return { available: true };
    },
    render: (props) => React.createElement(HierarchicalView, props)
  });

  viewRegistry.register({
    id: 'graph',
    label: 'Graph',
    canRender: ({ spec, schema, mapping }) => {
      if (mapping?.type === 'graph') {
        return { available: true };
      }
      const hasGroupBy = !!spec?.state?.groupBy;
      const hasHierarchy = schema?.columns?.some(col => col.type === 'hierarchy');
      if (!hasGroupBy && !hasHierarchy) {
        return { available: false, reason: 'Requires a hierarchy column or Group By.' };
      }
      return { available: true };
    },
    render: (props) => React.createElement(GraphView, props)
  });
}
