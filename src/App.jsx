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
import { SpecManager } from './core/SpecManager';
import { providerRegistry } from './plugins/ProviderRegistry';
import { backendRegistry } from './plugins/BackendRegistry';
import { viewRegistry } from './plugins/ViewRegistry';
import { registerDefaultProviders } from './plugins/registerDefaultProviders';
import { registerDefaultBackends } from './plugins/registerDefaultBackends';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import ViewTabs from './components/ViewTabs';
import DataView from './components/DataView';
import Pagination from './components/Pagination';
import bundledSettings from './data/settings.json';
import { listDataFiles, loadDataFile, loadSpecForData } from './utils/dataFiles';
import './styles/App.css';

function PhosApp({ settings }) {
  // Register default plugins once for providers/backends.
  registerDefaultProviders();
  registerDefaultBackends();

  // Load built-in data files
  const dataFiles = listDataFiles();
  
  // If settings provide a direct data URL, inject it as a "Custom Data" option
  // This supports the Docker "mount data and settings" use case
  if (settings.dataSource && settings.dataSource.url) {
    const customName = settings.defaultDataset || 'custom';
    // Only add if not already present
    if (!dataFiles.find(f => f.name === customName)) {
      dataFiles.unshift({
        name: customName,
        url: settings.dataSource.url,
        // Infer type or default to json
        type: settings.dataSource.url.endsWith('.csv') ? 'csv' : 'json'
      });
    }
  }

  const defaultDataset = settings.defaultDataset || dataFiles[0]?.name;
  const [heuristics, setHeuristics] = useState({});

  const [selectedDataset, setSelectedDataset] = useState(defaultDataset || '');
  const [specManager, setSpecManager] = useState(null);
  const [provider, setProvider] = useState(null);
  const [pluginSettings, setPluginSettings] = useState(settings.enabledPlugins || {});
  
  const [spec, setSpec] = useState(null);
  const [result, setResult] = useState(null);
  const [schema, setSchema] = useState(null);
  const [uniqueValues, setUniqueValues] = useState(new Map());
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  // Bump this version to reinitialize when the data source changes.
  const [dataSourceVersion, setDataSourceVersion] = useState(0);
  const [dataSourceDataset, setDataSourceDataset] = useState(defaultDataset || '');
  // Debounce data source changes to avoid reloading on every keystroke.
  const dataSourceTimerRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizingRef = useRef(false);

  useEffect(() => {
    let active = true;

    // Load data/spec for the selected dataset and rewire provider/backend.
    async function initializeData() {
      setLoading(true);
      setErrorMessage('');
      const selectedFile = dataFiles.find(file => file.name === selectedDataset);
      if (!selectedFile) {
        setErrorMessage(`Selected dataset '${selectedDataset}' not found.`);
        setLoading(false);
        return;
      }

      // Handle custom URL injection (Docker mounting case)
      let dataset;
      if (selectedFile.url) {
          try {
             const res = await fetch(selectedFile.url);
             if (!res.ok) throw new Error(`Failed to fetch ${selectedFile.url}`);
             if (selectedFile.type === 'csv') {
                 dataset = await res.text();
             } else {
                 dataset = await res.json();
             }
          } catch (e) {
             setErrorMessage(e.message);
             setLoading(false);
             return;
          }
      } else {
         dataset = await loadDataFile(selectedFile);
      }

      // Reuse the in-memory spec when the data source changes for the same dataset.
      const shouldUseCurrentSpec = dataSourceVersion > 0 && specManager && dataSourceDataset === selectedDataset;
      
      let specData;
      if (shouldUseCurrentSpec) {
          specData = specManager.getSpec();
      } else {
          // If we are loading from a URL (e.g. Docker mounted folder), try to fetch matching spec.json
          if (selectedFile.url) {
              try {
                  // Heuristic: try .spec.json replacement
                  // e.g. data.json -> data.spec.json
                  const specUrl = selectedFile.url.replace(/(\.json|\.csv)?$/, '.spec.json');
                  const res = await fetch(specUrl);
                  if (res.ok) {
                      specData = await res.json();
                  }
              } catch (e) {
                  console.warn('No custom spec found or failed to load:', e);
              }
          }

          if (!specData) {
            // Try to load built-in sidebar spec if exists
            specData = await loadSpecForData(selectedFile);
          }
          
          // Fallback to default empty spec if nothing found
          if (!specData) {
             specData = {}; 
          }

          // If we have custom settings-defined data, ensure spec uses it
          if (settings.dataSource && selectedDataset === (settings.defaultDataset || 'custom')) {
             specData = {
                 ...specData,
                 settings: {
                     ...specData.settings,
                     dataSource: settings.dataSource
                 }
             };
          }
      }

      if (!dataset || !specData) {
        setErrorMessage('Failed to load dataset or spec file.');
        setLoading(false);
        return;
      }

      const dataSourceSettings = specData.settings?.dataSource || {
        mode: 'provider',
        providerType: 'native',
        config: {}
      };

      // Ensure native provider is enabled in spec settings if we force it
      // This merges global settings with spec-specific overrides
      const mergedPluginSettings = {
        ...settings.enabledPlugins,
        ...(specData.settings?.plugins || {})
      };
      
      const providerType = 'native';
      const providerConfig = dataSourceSettings.config || specData.provider?.config || {};
      const backendType = 'native';
      const backendConfig = specData.backend?.config || {};
      const heuristicSettings = specData.settings?.heuristics || {};
      
      // Use merged settings for validation
      const activePlugins = mergedPluginSettings;

      if (activePlugins.providers && !activePlugins.providers.includes(providerType)) {
        // Auto-enable if missing, for convenience in custom mode
        if (providerType === 'native') {
           // pass
        } else {
           throw new Error(`Provider '${providerType}' is not enabled in settings.`);
        }
      }

      // Force Native for now as per instructions
      const providerInstance = providerRegistry.create('native', providerConfig);
      await providerInstance.load(dataset);

      const backendInstance = backendRegistry.create('native', backendConfig);
      if (backendInstance?.index) {
        await backendInstance.index(dataset);
      }

      const manager = new SpecManager(specData);
      manager.setProvider(providerInstance);
      manager.setBackend(backendInstance);
      
      // Inject global readOnly setting into spec if present
      if (settings.readOnly) {
          manager.updateSpec({ 
              settings: { 
                  ...manager.getSpec().settings, 
                  readOnly: true 
              } 
          });
      }

      if (!active) {
        return;
      }

      setProvider(providerInstance);
      setSpecManager(manager);
      setRawData(dataset);

      const schemaData = await providerInstance.getSchema();
      setSchema(schemaData);

      // Pre-fetch unique values
      const valuesMap = new Map();
      await Promise.all(schemaData.columns.map(async col => {
        try {
          const values = await providerInstance.getUniqueValues(col.name);
          valuesMap.set(col.name, values);
        } catch (e) {
          console.warn(`Failed to load values for ${col.name}`, e);
          valuesMap.set(col.name, []);
        }
      }));
      setUniqueValues(valuesMap);

      const queryResult = await manager.query();
      setResult(queryResult);
      setSpec(manager.getSpec());
      setHeuristics(heuristicSettings);
      setPluginSettings(activePlugins);
      setLoading(false);
    }
    initializeData().catch((error) => {
      setErrorMessage(error?.message || 'Failed to initialize dataset.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [selectedDataset, dataSourceVersion, settings]); // Re-run if settings change

  useEffect(() => {
    if (!specManager) {
      return;
    }
    const currentSettings = spec?.settings ?? {};
    specManager.updateSpec({
      settings: {
        ...currentSettings,
        heuristics,
        plugins: pluginSettings
      }
    });
  }, [heuristics, pluginSettings, specManager]);

  useEffect(() => {
    if (!specManager) {
      return undefined;
    }

    const unsubscribe = specManager.subscribe(async (newSpec) => {
      setSpec(newSpec);
      const queryResult = await specManager.query();
      setResult(queryResult);
    });

    return unsubscribe;
  }, [specManager]);

  // Clear debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (dataSourceTimerRef.current) {
        clearTimeout(dataSourceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizingRef.current) {
        return;
      }
      const nextWidth = Math.max(220, Math.min(480, event.clientX));
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mouseup', handleMouseUp);

    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  const handleDividerKeyDown = (event) => {
    const step = 12;
    if (event.key === 'ArrowLeft') {
      setSidebarWidth(value => Math.max(220, value - step));
      event.preventDefault();
    }
    if (event.key === 'ArrowRight') {
      setSidebarWidth(value => Math.min(480, value + step));
      event.preventDefault();
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div style={{textAlign: 'center'}}>
          <div>Loading dataset...</div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="error-state">
        <h3>Something went wrong</h3>
        <p>{errorMessage}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  if (!result || !schema || !specManager) {
    return (
      <div className="loading">
        <div style={{color: 'red'}}>
           Loading finished but state is incomplete.
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div
        className="app-grid"
        style={{ gridTemplateColumns: `${sidebarWidth}px 6px 1fr` }}
      >
        <header className="top-left">
          <div className="brand-block">
            <span className="brand-title">PHOS</span>
            <span className="brand-subtitle">data explorer</span>
          </div>
        </header>
        <button
          type="button"
          className="grid-divider"
          onMouseDown={() => { isResizingRef.current = true; }}
          onKeyDown={handleDividerKeyDown}
          aria-label="Resize sidebar"
        />
        <header className="top-right">
          <Toolbar 
            schema={schema}
            specManager={specManager}
            spec={spec}
            data={rawData}
            datasets={dataFiles}
            selectedDataset={selectedDataset}
            onDatasetChange={setSelectedDataset}
            onDataSourceChange={() => {
              setDataSourceDataset(selectedDataset);
              if (dataSourceTimerRef.current) {
                clearTimeout(dataSourceTimerRef.current);
              }
              dataSourceTimerRef.current = setTimeout(() => {
                setDataSourceVersion(value => value + 1);
              }, 300);
            }}
            heuristics={heuristics}
            onHeuristicsChange={setHeuristics}
            pluginSettings={pluginSettings}
            onPluginSettingsChange={setPluginSettings}
            pluginOptions={{
              providers: providerRegistry.list(),
              backends: backendRegistry.list(),
              views: viewRegistry.list().map(view => view.id)
            }}
            layout="top"
            inline
          />
        </header>
        <aside className="bottom-left">
          <Sidebar 
            schema={schema}
            provider={provider}
            specManager={specManager}
            spec={spec}
            uniqueValues={uniqueValues}
          />
        </aside>
        <button
          type="button"
          className="grid-divider"
          onMouseDown={() => { isResizingRef.current = true; }}
          onKeyDown={handleDividerKeyDown}
          aria-label="Resize sidebar"
        />
        <main className="bottom-right">
          <ViewTabs 
            activeView={spec.state.activeView}
            specManager={specManager}
            spec={spec}
            schema={schema}
            rightControls={(
              <Toolbar 
                schema={schema}
                specManager={specManager}
                spec={spec}
                data={rawData}
                datasets={dataFiles}
                selectedDataset={selectedDataset}
                onDatasetChange={setSelectedDataset}
                onDataSourceChange={() => {
                  setDataSourceDataset(selectedDataset);
                  if (dataSourceTimerRef.current) {
                    clearTimeout(dataSourceTimerRef.current);
                  }
                  dataSourceTimerRef.current = setTimeout(() => {
                    setDataSourceVersion(value => value + 1);
                  }, 300);
                }}
                heuristics={heuristics}
                onHeuristicsChange={setHeuristics}
                pluginSettings={pluginSettings}
                onPluginSettingsChange={setPluginSettings}
                pluginOptions={{
                  providers: providerRegistry.list(),
                  backends: backendRegistry.list(),
                  views: viewRegistry.list().map(view => view.id)
                }}
                layout="actions"
                inline
              />
            )}
          />
          
          <DataView 
            viewName={spec.state.activeView}
            result={result}
            spec={spec}
            schema={schema}
            specManager={specManager}
            heuristics={heuristics}
          />
          
          <Pagination 
            spec={spec}
            result={result}
            specManager={specManager}
          />
        </main>
      </div>
    </div>
  );
}

function App() {
   const [appSettings, setAppSettings] = useState(null);

   useEffect(() => {
     fetch('./settings.json')
       .then(res => {
         // If file doesn't exist (local dev without copy), use defaults
         if (!res.ok) throw new Error("No runtime settings found");
         return res.json();
       })
       .then(config => setAppSettings({ ...bundledSettings, ...config }))
       .catch(err => {
         // console.log("Using bundled settings", err);
         setAppSettings(bundledSettings);
       });
   }, []);

   if (!appSettings) {
       return (
         <div className="loading">
           <div style={{textAlign: 'center'}}>Initializing Phos...</div>
         </div>
       );
   }

   return <PhosApp settings={appSettings} />;
}

export default App;
