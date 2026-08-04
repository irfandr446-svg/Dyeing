import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function PlantManager() {
  const { plants, treatments, addPlant, renamePlant, deletePlant } = useApp();
  const [newName, setNewName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const usage = (plantId: string) => treatments.filter((t) => t.plantId === plantId).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Plants</div>
          <div className="page-subtitle">Every Treatment belongs to exactly one plant. Programs stay within a single plant.</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="New plant name (e.g. Plant 6, Custom Plant)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) { addPlant(newName.trim()); setNewName(''); }
          }}
        />
        <button
          className="btn btn-primary"
          disabled={!newName.trim()}
          onClick={() => { addPlant(newName.trim()); setNewName(''); }}
        >
          <Plus size={14} /> Add Plant
        </button>
      </div>

      {plants.map((p) => (
        <div className="list-manager-row" key={p.id}>
          <input
            defaultValue={p.name}
            onBlur={(e) => { if (e.target.value.trim() && e.target.value !== p.name) renamePlant(p.id, e.target.value.trim()); }}
          />
          <span className="badge" style={{ marginRight: 10 }}>{usage(p.id)} treatment(s)</span>
          <button className="icon-btn" onClick={() => setConfirmId(p.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {confirmId && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>Delete plant?</h3>
            <p>Treatments assigned to this plant will remain but no longer be filterable by it. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deletePlant(confirmId); setConfirmId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
