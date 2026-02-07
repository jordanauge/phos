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

import React from 'react';
import { viewRegistry } from '../plugins/ViewRegistry';
import { registerDefaultViews } from '../plugins/registerDefaultViews';
import './DataView.css';

let viewsRegistered = false;

function DataView({ viewName, result, spec, schema, specManager, heuristics }) {
  // Register default views once to keep plugins decoupled.
  if (!viewsRegistered) {
    registerDefaultViews();
    viewsRegistered = true;
  }

  const renderView = () => {
    const viewPlugin = viewRegistry.get(viewName);
    if (!viewPlugin) {
      return <div>Unknown view: {viewName}</div>;
    }

    const mapping = (spec.visualizations || []).find(viz => viz.id === viewName);
    return viewPlugin.render({ result, spec, schema, specManager, mapping, heuristics });
  };

  return (
    <div className="data-view">
      {renderView()}
    </div>
  );
}

export default DataView;
