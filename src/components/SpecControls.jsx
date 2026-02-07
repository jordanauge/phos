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

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { safeJsonParse } from '../utils/safeJsonParse';
import './SpecControls.css';

function SpecControls({ specManager }) {
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const json = specManager.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spec-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const json = await file.text();
      const newSpec = safeJsonParse(json);

      // Apply imported spec while preserving defaults.
      const current = specManager.getSpec();
      const nextState = newSpec.state ?? current.state;
      specManager.updateSpec({
        ...newSpec,
        state: {
          ...current.state,
          ...nextState
        },
        presets: newSpec.presets ?? current.presets
      });

      setShowImport(false);
      alert('Spec imported successfully!');
    } catch (err) {
      alert(`Failed to import spec: ${err.message}`);
    }
  };

  const handleSavePreset = () => {
    const name = prompt('Preset name:');
    if (!name) return;

    const currentSpec = specManager.getSpec();
    specManager.addPreset({
      name,
      groupBy: currentSpec.state.groupBy,
      filters: currentSpec.state.filters,
      visibleColumns: currentSpec.state.visibleColumns
    });
    alert(`Preset "${name}" saved!`);
  };

  return (
    <div className="spec-controls">
      <button onClick={handleExport} title="Export current configuration as JSON">
        💾 Export Spec
      </button>
      <button onClick={() => setShowImport(!showImport)} title="Import spec from JSON file">
        📂 Import Spec
      </button>
      <button onClick={handleSavePreset} title="Save current state as preset">
        ⭐ Save Preset
      </button>
      
      {showImport && (
        <div className="import-modal">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            onClick={(e) => e.target.value = null}
          />
        </div>
      )}
    </div>
  );
}

export default SpecControls;

SpecControls.propTypes = {
  specManager: PropTypes.shape({
    toJSON: PropTypes.func,
    getSpec: PropTypes.func,
    updateSpec: PropTypes.func,
    addPreset: PropTypes.func
  }).isRequired
};
