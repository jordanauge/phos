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

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './InfoTooltip.css';

function InfoTooltip({ column, metadata, onEdit }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(metadata?.description || '');
  const [editedReadOnly, setEditedReadOnly] = useState(!!metadata?.readOnly);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  useEffect(() => {
    setEditedDescription(metadata?.description || '');
    setEditedReadOnly(!!metadata?.readOnly);
  }, [metadata?.description, metadata?.readOnly]);

  useEffect(() => {
    if (!showTooltip || !iconRef.current) {
      return;
    }
    const rect = iconRef.current.getBoundingClientRect();
    const nextTop = rect.bottom + 8;
    const nextLeft = rect.left + rect.width / 2;
    setPosition({ top: nextTop, left: nextLeft });
  }, [showTooltip]);

  const handleSave = () => {
    if (onEdit) {
      onEdit(column, { description: editedDescription, readOnly: editedReadOnly });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDescription(metadata?.description || '');
    setEditedReadOnly(!!metadata?.readOnly);
    setIsEditing(false);
  };

  const displayMetadata = metadata || {};
  const readOnlyControl = (
    <label className={`info-tooltip-toggle ${isEditing ? '' : 'is-disabled'}`.trim()}>
      <input
        type="checkbox"
        checked={editedReadOnly}
        onChange={(e) => setEditedReadOnly(e.target.checked)}
        disabled={!isEditing}
      />
      Read-only column
    </label>
  );

  return (
    <div 
      className="info-tooltip-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => !isEditing && setShowTooltip(false)}
    >
      <button className="info-icon" title="Show description" ref={iconRef}>ⓘ</button>
      {showTooltip && createPortal(
        <div className="info-tooltip-popup" style={{ top: position.top, left: position.left }}>
          {isEditing ? (
            <div className="info-tooltip-edit">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={4}
                className="info-tooltip-textarea"
                autoFocus
              />
              {readOnlyControl}
              <div className="info-tooltip-actions">
                <button onClick={handleSave} className="info-btn save">Save</button>
                <button onClick={handleCancel} className="info-btn cancel">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="info-tooltip-header">
                <strong>{column}</strong>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="info-edit-btn"
                  title="Edit description"
                >
                  ✏️
                </button>
              </div>
              <p className="info-tooltip-description">{displayMetadata.description || 'No description yet.'}</p>
              {readOnlyControl}
              {displayMetadata.examples && displayMetadata.examples.length > 0 && (
                <div className="info-tooltip-examples">
                  <strong>Examples:</strong> {displayMetadata.examples.join(', ')}
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default InfoTooltip;
