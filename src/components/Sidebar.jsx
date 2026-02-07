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
import FilterCategories from './FilterCategories';
import './Sidebar.css';

function Sidebar({ schema, provider, specManager, spec, uniqueValues }) {
  const handleClearFilters = () => {
    specManager.clearFilters();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Filters</h3>
        <button className="reset-btn" onClick={handleClearFilters}>
          Reset
        </button>
      </div>

      <FilterCategories
        schema={schema}
        provider={provider}
        specManager={specManager}
        spec={spec}
        uniqueValues={uniqueValues}
      />
    </div>
  );
}

export default Sidebar;
