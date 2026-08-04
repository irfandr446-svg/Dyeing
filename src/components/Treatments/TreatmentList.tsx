import React, { useMemo, useState } from 'react';
import { Plus, Trash2, FileDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDuration } from '../../utils/timeUtils';
import { exportTreatmentPDF } from '../../utils/pdfExport';

export default function TreatmentList({ onOpen }: { onOpen: (id: string | 'new') => void }) {
  const { treatments, plants, categories, features, deleteTreatment, currentPlantId } = useApp();
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const featureMap = useMemo(() => Object.fromEntries(features.map((f) => [f.id, f])), [features]);
  const plantName = (id: string) => plants.find((p) => p.id === id)?.name || '—';
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '—';

  const filtered = treatments.filter((t) => {
    const matchSearch = !search || t.number.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase());
    const matchPlant = plantFilter === 'all' || t.plantId === plantFilter;
    const matchCategory = categoryFilter === 'all' || t.categoryId === categoryFilter;
    return matchSearch && matchPlant && matchCategory;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Treatments</div>
          <div className="page-subtitle">Process profiles for individual dyeing treatments.</div>
        </div>
        <button className="btn btn-primary" onClick={() => onOpen('new')}><Plus size={14} /> New Treatment</button>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search by number or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={plantFilter} onChange={(e) => setPlantFilter(e.target.value)}>
          <option value="all">All Plants</option>
          {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No treatments found. Create one to get started.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Number</th><th>Name</th><th>Plant</th><th>Category</th><th>Total Time</th><th>Last Modified</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} onClick={() => onOpen(t.id)}>
                <td><strong>{t.number}</strong></td>
                <td>{t.name}</td>
                <td>{plantName(t.plantId)}</td>
                <td>{categoryName(t.categoryId)}</td>
                <td>{formatDuration(t.totalDurationMinutes)}</td>
                <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title="Export PDF" onClick={() => exportTreatmentPDF(t, categoryName(t.categoryId), plantName(t.plantId), featureMap)}>
                    <FileDown size={15} />
                  </button>
                  <button className="icon-btn" title="Delete" onClick={() => setConfirmId(t.id)}>
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
            <h3>Delete treatment?</h3>
            <p>This cannot be undone. Programs referencing it will show a missing treatment.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteTreatment(confirmId); setConfirmId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
