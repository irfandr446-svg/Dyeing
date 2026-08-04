import React, { useState } from 'react';
import { Plus, Trash2, FileDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDuration } from '../../utils/timeUtils';
import { exportProgramPDF } from '../../utils/pdfExport';

export default function ProgramList({ onOpen }: { onOpen: (id: string | 'new') => void }) {
  const { programs, plants, treatments, features, deleteProgram } = useApp();
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const plantName = (id: string) => plants.find((p) => p.id === id)?.name || '—';
  const featureMap = Object.fromEntries(features.map((f) => [f.id, f]));
  const treatmentMap = Object.fromEntries(treatments.map((t) => [t.id, t]));

  const filtered = programs.filter((p) => {
    const matchSearch = !search || p.number.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase());
    const matchPlant = plantFilter === 'all' || p.plantId === plantFilter;
    return matchSearch && matchPlant;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Programs</div>
          <div className="page-subtitle">Ordered collections of Treatments within a single Plant.</div>
        </div>
        <button className="btn btn-primary" onClick={() => onOpen('new')}><Plus size={14} /> New Program</button>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search by number or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={plantFilter} onChange={(e) => setPlantFilter(e.target.value)}>
          <option value="all">All Plants</option>
          {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No programs found. Create one to get started.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Number</th><th>Name</th><th>Plant</th><th>Treatments</th><th>Total Time</th><th>Last Modified</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} onClick={() => onOpen(p.id)}>
                <td><strong>{p.number}</strong></td>
                <td>{p.name}</td>
                <td>{plantName(p.plantId)}</td>
                <td>{p.entries.length}</td>
                <td>{formatDuration(p.totalDurationMinutes)}</td>
                <td>{new Date(p.updatedAt).toLocaleDateString()}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title="Export PDF" onClick={() => exportProgramPDF(p, plantName(p.plantId), treatmentMap, featureMap)}>
                    <FileDown size={15} />
                  </button>
                  <button className="icon-btn" title="Delete" onClick={() => setConfirmId(p.id)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmId && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>Delete program?</h3>
            <p>This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteProgram(confirmId); setConfirmId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
