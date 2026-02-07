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
import PropTypes from 'prop-types';
import * as d3 from 'd3';
import { safeJsonParse } from '../../utils/safeJsonParse';
import './GraphView.css';

function GraphView({ result, spec, schema, mapping, specManager }) {
  const containerRef = useRef(null);
  const [nodeContextMenu, setNodeContextMenu] = useState(null);
  const groupByCol = spec.state.groupBy || schema.columns.find(c => c.type === 'hierarchy')?.name;
  const viewId = mapping?.id || 'graph';
  const nodeIdField = mapping?.node?.id || 'id';
  const nodeLabelField = mapping?.node?.label || nodeIdField;

  function handleNodeContextMenu(node, event) {
    event.preventDefault();
    event.stopPropagation();
    setNodeContextMenu({
      node,
      x: event.clientX,
      y: event.clientY
    });
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const graphData = buildGraphData(result.data, mapping, groupByCol);
    if (!graphData) return;
    renderD3Graph(containerRef.current, graphData, mapping, handleNodeContextMenu);
  }, [result, mapping, groupByCol]);

  // Close the context menu when clicking outside or pressing Escape.
  useEffect(() => {
    const handleCloseMenu = () => setNodeContextMenu(null);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setNodeContextMenu(null);
      }
    };
    if (nodeContextMenu) {
      document.addEventListener('click', handleCloseMenu);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('click', handleCloseMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodeContextMenu]);

  const handleFilterByNode = (node) => {
    if (!specManager) {
      setNodeContextMenu(null);
      return;
    }

    const filterColumn = mapping?.type === 'graph' ? nodeLabelField : groupByCol;
    const filterValue = mapping?.type === 'graph'
      ? node.name
      : (node.fullPath || node.name);

    if (filterColumn) {
      specManager.addFilter({
        column: filterColumn,
        operator: '=',
        value: filterValue,
        enabled: true
      });
    }
    setNodeContextMenu(null);
  };

  const handleEditNodeLabel = async (node) => {
    if (!specManager || mapping?.type !== 'graph') {
      setNodeContextMenu(null);
      return;
    }

    if (typeof specManager.updateRowsByColumn !== 'function') {
      alert('Editing is not supported by the current data source.');
      setNodeContextMenu(null);
      return;
    }

    const nextLabel = prompt('Edit node label:', node.name);
    if (!nextLabel) {
      setNodeContextMenu(null);
      return;
    }

    try {
      const updates = {
        [nodeLabelField]: nextLabel
      };
      if (nodeLabelField === nodeIdField) {
        updates[nodeIdField] = nextLabel;
      }
      await specManager.updateRowsByColumn(nodeIdField, node.id, updates);
    } catch (err) {
      alert(err.message || 'Failed to update node label.');
    }
    setNodeContextMenu(null);
  };

  const handleEditViewSpec = () => {
    if (!specManager) {
      setNodeContextMenu(null);
      return;
    }

    // Allow direct editing of the graph visualization mapping in JSON.
    const currentMapping = mapping || { id: viewId, type: 'graph' };
    const nextJson = prompt('Edit graph mapping (JSON):', JSON.stringify(currentMapping, null, 2));
    if (!nextJson) {
      setNodeContextMenu(null);
      return;
    }

    try {
      const nextMapping = safeJsonParse(nextJson);
      const currentVisualizations = spec.visualizations || [];
      const nextVisualizations = [...currentVisualizations];
      const index = nextVisualizations.findIndex(viz => viz.id === viewId);
      if (index >= 0) {
        nextVisualizations[index] = nextMapping;
      } else {
        nextVisualizations.push(nextMapping);
      }
      specManager.updateSpec({ visualizations: nextVisualizations });
    } catch (err) {
      alert(`Invalid JSON: ${err.message}`);
    }
    setNodeContextMenu(null);
  };

  if (!mapping?.type && !groupByCol) {
    return (
      <div className="empty-state">
        <p>Select a hierarchical column or "Group By" to see graph view</p>
        <p style={{ marginTop: '1rem' }}>Try: "department" (has hierarchies like Engineering &gt; Backend)</p>
      </div>
    );
  }

  return (
    <div className="graph-view">
      <div ref={containerRef} className="graph-container" />

      {nodeContextMenu && (
        <div
          className="graph-context-menu"
          style={{ top: nodeContextMenu.y, left: nodeContextMenu.x }}
        >
          <button onClick={() => handleFilterByNode(nodeContextMenu.node)}>
            🔍 Filter by "{String(nodeContextMenu.node.name).substring(0, 20)}"
          </button>
          {mapping?.type === 'graph' && (
            <button onClick={() => handleEditNodeLabel(nodeContextMenu.node)}>
              ✏️ Edit node label
            </button>
          )}
          <button onClick={handleEditViewSpec}>🛠️ Edit graph spec</button>
        </div>
      )}
    </div>
  );
}

// Build graph data from mapping or fallback hierarchy.
function buildGraphData(data, mapping, column) {
  if (mapping?.type === 'graph') {
    return buildGraphFromMapping(data, mapping);
  }

  if (!column) {
    return null;
  }

  return buildHierarchyGraph(data, column);
}

function buildHierarchyGraph(data, column) {
  const nodes = new Map();
  const links = [];

  nodes.set('root', { id: 'root', name: 'All Data', count: data.length, level: 0 });

  data.forEach(row => {
    const value = row[column];
    if (!value) return;

    if (String(value).includes('>')) {
      const parts = String(value).split('>').map(p => p.trim());
      let parent = 'root';

      parts.forEach((part, idx) => {
        const id = parts.slice(0, idx + 1).join(' > ');
        if (!nodes.has(id)) {
          nodes.set(id, {
            id,
            name: part,
            fullPath: id,
            count: 0,
            level: idx + 1
          });
          links.push({ source: parent, target: id });
        }
        nodes.get(id).count++;
        parent = id;
      });
    } else {
      const nodeId = String(value);
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, { id: nodeId, name: nodeId, count: 0, level: 1 });
        links.push({ source: 'root', target: nodeId });
      }
      nodes.get(nodeId).count++;
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    links
  };
}

function buildGraphFromMapping(data, mapping) {
  const nodes = new Map();
  const links = [];
  const nodeIdField = mapping.node?.id || 'id';
  const nodeLabelField = mapping.node?.label || nodeIdField;
  const groupKeys = mapping.grouping?.keys || [];

  data.forEach(row => {
    const nodeId = row[nodeIdField] || row.Name || row.name;
    if (!nodeId) return;

    const groupValue = groupKeys.length > 0 ? row[groupKeys[0]] : null;
    if (!nodes.has(nodeId)) {
      nodes.set(nodeId, {
        id: nodeId,
        name: row[nodeLabelField] || nodeId,
        count: 0,
        group: groupValue,
        level: groupValue ? 1 : 0
      });
    }
    nodes.get(nodeId).count++;

    const sourceField = mapping.edge?.source;
    const targetField = mapping.edge?.target;
    const parentField = mapping.edge?.parentField;

    if (sourceField && targetField) {
      const sources = Array.isArray(row[sourceField]) ? row[sourceField] : [row[sourceField]];
      const targets = Array.isArray(row[targetField]) ? row[targetField] : [row[targetField]];

      sources.filter(Boolean).forEach(source => {
        targets.filter(Boolean).forEach(target => {
          links.push({ source, target });
        });
      });
    } else if (parentField) {
      const parents = Array.isArray(row[parentField]) ? row[parentField] : [row[parentField]];
      parents.filter(Boolean).forEach(parent => {
        links.push({ source: parent, target: nodeId });
      });
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    links
  };
}

function renderD3Graph(container, graphData, mapping, onNodeContextMenu) {
  const width = container.clientWidth;
  const height = mapping?.layout?.height || 600;

  d3.select(container).selectAll('*').remove();

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height]);

  const g = svg.append('g');

  svg.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => g.attr('transform', event.transform)));

  const simulation = d3.forceSimulation(graphData.nodes)
    .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(mapping?.layout?.linkDistance || 100))
    .force('charge', d3.forceManyBody().strength(mapping?.layout?.charge || -300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => 5 + Math.sqrt(d.count) * 2 + 10));

  const link = g.append('g')
    .selectAll('line')
    .data(graphData.links)
    .join('line')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 2);

  const node = g.append('g')
    .selectAll('circle')
    .data(graphData.nodes)
    .join('circle')
    .attr('r', d => 5 + Math.sqrt(d.count) * 2)
    .attr('fill', d => d3.schemeCategory10[(d.group ? String(d.group).length : d.level) % 10])
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'grab')
    .call(drag(simulation));

  node.on('contextmenu', (event, d) => {
    if (!onNodeContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
    onNodeContextMenu(d, event);
  });

  const label = g.append('g')
    .selectAll('text')
    .data(graphData.nodes)
    .join('text')
    .text(d => `${d.name} (${d.count})`)
    .attr('font-size', 12)
    .attr('font-weight', d => d.level === 0 ? 'bold' : 'normal')
    .attr('dx', d => 5 + Math.sqrt(d.count) * 2 + 5)
    .attr('dy', 4)
    .style('pointer-events', 'none');

  node.append('title')
    .text(d => `${d.fullPath || d.name}\n${d.count} items`);

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    label
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  });

  function drag(simulation) {
    return d3.drag()
      .on('start', (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });
  }
}

export default GraphView;

GraphView.propTypes = {
  result: PropTypes.shape({
    data: PropTypes.array.isRequired
  }).isRequired,
  spec: PropTypes.shape({
    state: PropTypes.object.isRequired,
    visualizations: PropTypes.array
  }).isRequired,
  schema: PropTypes.shape({
    columns: PropTypes.array.isRequired
  }).isRequired,
  mapping: PropTypes.object,
  specManager: PropTypes.shape({
    addFilter: PropTypes.func,
    updateSpec: PropTypes.func,
    updateRowsByColumn: PropTypes.func
  })
};
