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
import './MetricDetailModal.css';

function MetricDetailModal({ row, schema, onClose, onFilterBy }) {
  if (!row) return null;

  const columns = schema?.columns || Object.keys(row).map(k => ({ name: k }));
  
  // Group columns by "importance" if possible, or just list them
  // For now, simple list, but putting Name/Description first
  const orderedKeys = columns.map(c => c.name);
  
  // Move Name and Description to top if they exist
  const priorityCols = ['Name', 'Description', 'Layer', 'Scope'];
  priorityCols.reverse().forEach(col => {
    const idx = orderedKeys.indexOf(col);
    if (idx > -1) {
      orderedKeys.splice(idx, 1);
      orderedKeys.unshift(col);
    }
  });

  return (
    <div className="metric-detail-modal-overlay" onClick={onClose}>
      <div className="metric-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="metric-detail-header">
          <h2>Metric Details</h2>
          <button className="metric-detail-close" onClick={onClose}>&times;</button>
        </div>
        <div className="metric-detail-content">
          {orderedKeys.map(key => {
            const value = row[key];
            if (key.startsWith('__')) return null; // Skip internal fields
            
            return (
              <div key={key} className="metric-detail-row">
                <div className="metric-detail-label">{key}</div>
                <div className="metric-detail-value">
                   {value === null || value === undefined ? <span style={{color: '#ccc'}}>null</span> : String(value)}
                   {/* Add a small filter button next to values? */}
                </div>
              </div>
            );
          })}
        </div>
        <div className="metric-detail-actions">
           {/* Potential future actions: Edit, Delete, etc. */}
           <button onClick={onClose} className="toolbar-btn">Close</button>
        </div>
      </div>
    </div>
  );
}

export default MetricDetailModal;
