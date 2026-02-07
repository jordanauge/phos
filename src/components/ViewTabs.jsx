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

import React, { useEffect, useMemo, useState } from 'react';
import { viewRegistry } from '../plugins/ViewRegistry';
import './ViewTabs.css';

function ViewTabs({ activeView, specManager, spec, schema, rightControls }) {
  const [showAddViews, setShowAddViews] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const enabledViews = spec?.settings?.plugins?.views || viewRegistry.list().map(view => view.id);

  // Build view metadata with availability checks and display labels.
  const viewMeta = useMemo(() => {
    return viewRegistry.list().map(view => {
      const mapping = (spec?.visualizations || []).find(viz => viz.id === view.id);
      const status = view.canRender ? view.canRender({ spec, schema, mapping }) : { available: true };
      return {
        id: view.id,
        label: view.label,
        available: status.available,
        reason: status.reason || '',
        enabled: true // FORCE ALL VIEWS ENABLED AS REQUESTED
      };
    });
  }, [spec, schema, enabledViews]);

  const visibleViews = viewMeta.filter(view => view.enabled && view.available);
  const hiddenEnabled = viewMeta.filter(view => view.enabled && !view.available);
  const availableToAdd = viewMeta.filter(view => !view.enabled);

  // Keep the active view aligned with what is currently available.
  useEffect(() => {
    if (!visibleViews.length) {
      return;
    }
    const isActiveVisible = visibleViews.some(view => view.id === activeView);
    if (!isActiveVisible) {
      specManager.setActiveView(visibleViews[0].id);
    }
  }, [activeView, specManager, visibleViews]);

  const handleAddView = (viewId) => {
    const current = spec?.settings?.plugins?.views || [];
    if (current.includes(viewId)) {
      setShowAddViews(false);
      return;
    }
    const next = [...current, viewId];
    specManager.updateSpec({
      settings: {
        ...(spec?.settings || {}),
        plugins: {
          ...(spec?.settings?.plugins || {}),
          views: next
        }
      }
    });
    setShowAddViews(false);
  };

  // Context menu actions for view tabs.
  const handleTabContextMenu = (viewId, event) => {
    event.preventDefault();
    setContextMenu({
      viewId,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleHideView = (viewId) => {
    const current = spec?.settings?.plugins?.views || [];
    const next = current.filter(id => id !== viewId);
    specManager.updateSpec({
      settings: {
        ...(spec?.settings || {}),
        plugins: {
          ...(spec?.settings?.plugins || {}),
          views: next
        }
      }
    });
    setContextMenu(null);
  };

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('click', handleCloseMenu);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('click', handleCloseMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  return (
    <div className="view-tabs-container">
      <div className="view-tabs-bar">
        <div className="view-tabs-left">
          {visibleViews.map(view => (
            <button
              key={view.id}
              className={`tab-button ${activeView === view.id ? 'active' : ''}`}
              onClick={() => specManager.setActiveView(view.id)}
              onContextMenu={(event) => handleTabContextMenu(view.id, event)}
            >
              {view.label.toUpperCase()} VIEW
            </button>
          ))}
          {hiddenEnabled.map(view => (
            <span key={view.id} className="tab-warning" title={view.reason}>
              ⚠ {view.label}
            </span>
          ))}
          {availableToAdd.length > 0 && (
            <button className="tab-button add-view" onClick={() => setShowAddViews(!showAddViews)}>
              ➕ Add View
            </button>
          )}
          {showAddViews && availableToAdd.length > 0 && (
            <div className="view-dropdown">
              {availableToAdd.map(view => (
                <button key={view.id} onClick={() => handleAddView(view.id)}>
                  {view.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="view-tabs-right">
          {rightControls}
        </div>
      </div>

      {contextMenu && (
        <div
          className="view-tab-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => handleHideView(contextMenu.viewId)}>
            🙈 Hide view
          </button>
        </div>
      )}
    </div>
  );
}

export default ViewTabs;
