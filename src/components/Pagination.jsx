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
import './Pagination.css';

function Pagination({ spec, result, specManager }) {
  const currentPage = spec.state.pagination.page;
  const pageSize = spec.state.pagination.pageSize;
  // Treat null as "All" and 0 as "None" for pagination.
  const isAll = pageSize === null || pageSize === undefined;
  const totalPages = pageSize > 0 ? Math.ceil(result.totalCount / pageSize) : 1;

  const handlePageChange = (direction) => {
    const newPage = direction === 'next' ? currentPage + 1 : Math.max(1, currentPage - 1);
    specManager.setPagination(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize) => {
    if (newSize === 'all') {
      specManager.setPagination(1, null);
      return;
    }
    const size = Number(newSize);
    specManager.setPagination(1, size);
  };

  // When "All" is selected, show a simplified summary.
  if (isAll) {
    return (
      <div className="pagination">
        <span className="pagination-info">
          Showing all {result.totalCount} items
        </span>
        
        <select
          value="all"
          onChange={(e) => handlePageSizeChange(e.target.value)}
        >
          <option value="10">10 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
          <option value="all">All</option>
        </select>
      </div>
    );
  }

  if (pageSize === 0) {
    return (
      <div className="pagination">
        <span className="pagination-info">
          Showing 0 items (page size is 0)
        </span>
        <select
          value="0"
          onChange={(e) => handlePageSizeChange(e.target.value)}
        >
          <option value="10">10 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
          <option value="0">0 per page</option>
          <option value="all">All</option>
        </select>
      </div>
    );
  }

  return (
    <div className="pagination">
      <button
        onClick={() => handlePageChange('prev')}
        disabled={currentPage === 1}
      >
        ← Previous
      </button>
      
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
        ({result.totalCount} items)
      </span>
      
      <button
        onClick={() => handlePageChange('next')}
        disabled={currentPage >= totalPages}
      >
        Next →
      </button>
      
      <select
        value={String(pageSize)}
        onChange={(e) => handlePageSizeChange(e.target.value)}
      >
        <option value="10">10 per page</option>
        <option value="50">50 per page</option>
        <option value="100">100 per page</option>
        <option value="all">All</option>
      </select>
    </div>
  );
}

export default Pagination;
