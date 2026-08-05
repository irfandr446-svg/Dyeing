import React, { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function CategoryManagement() {
  const { categories, treatments, addCategory, renameCategory, deleteCategory } = useApp();
  const [newName, setNewName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const usage = (categoryId: string) => treatments.filter((t) => t.categoryId === categoryId).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Categories</div>
          <div className="page-subtitle">Used to organize and filter Treatments (e.g. Pretreatment, Cotton Dyeing, Washing).</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) { addCategory(newName.trim()); setNewName(''); }
          }}
        />
        <button
          className="btn btn-primary"
          disabled={!newName.trim()}
          onClick={() => { addCategory(newName.trim()); setNewName(''); }}
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {categories.map((c) => (
        <div className="list-manager-row" key={c.id}>
          <Pencil size={13} className="edit-affordance" />
          <input
            defaultValue={c.name}
            onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.name) renameCategory(c.id, e.target.value.trim()); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
          <span className="badge" style={{ marginRight: 10 }}>{usage(c.id)} treatment(s)</span>
          <button className="icon-btn" onClick={() => setConfirmId(c.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {confirmId && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>Delete category?</h3>
            <p>This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteCategory(confirmId); setConfirmId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
