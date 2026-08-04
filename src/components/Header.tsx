import React from 'react';
import { useApp } from '../context/AppContext';

export default function Header() {
  const { plants, currentPlantId, setCurrentPlantId, saveState } = useApp();

  return (
    <header className="app-header">
      <div className="brand">
        <img src="/logo.png" alt="Style Textile" />
        <div className="brand-text">
          <div className="company">STYLE TEXTILE</div>
          <div className="dept">Process &amp; Machine R&amp;D</div>
        </div>
      </div>

      <div className="plant-select">
        <span className={`save-indicator ${saveState}`}>
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'saved' && 'Saved'}
          {saveState === 'error' && 'Save failed'}
        </span>
        <label htmlFor="plant-picker" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          PLANT
        </label>
        <select id="plant-picker" value={currentPlantId} onChange={(e) => setCurrentPlantId(e.target.value)}>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </header>
  );
}
