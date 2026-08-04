import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FeatureKind } from '../../types';

const ICON_CHOICES = [
  'Droplet', 'ArrowDownToLine', 'Flame', 'Snowflake', 'Pause', 'Play', 'Syringe', 'Beaker',
  'PackagePlus', 'RefreshCw', 'FlaskConical', 'RotateCw', 'RotateCcw', 'Waves', 'Droplets',
  'ShowerHead', 'Sparkles', 'Scale', 'Brush', 'TestTube', 'UserCheck', 'Clock', 'Hourglass',
  'Bell', 'Octagon', 'Settings', 'Gauge', 'Timer', 'Wind',
];

const COLOR_CHOICES = ['#16a34a', '#ea580c', '#dc2626', '#0284c7', '#334155', '#ca8a04', '#0891b2', '#7c3aed', '#64748b'];

function FeatureIcon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Cmp = (Icons as any)[name] || Icons.Settings;
  return <Cmp size={size} color={color} />;
}

export default function FeatureLibraryView() {
  const { features, addFeature, updateFeature, deleteFeature } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', icon: 'Settings', color: '#334155', kind: 'custom' as FeatureKind });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Feature Library</div>
          <div className="page-subtitle">Building blocks used in the Treatment Builder timeline. Custom features behave exactly like built-in ones.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Add Feature</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
        {features.map((f) => (
          <div key={f.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}>
            <div className="feature-icon-dot" style={{ background: f.color, width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FeatureIcon name={f.icon} size={16} color="#fff" />
            </div>
            <input
              defaultValue={f.name}
              style={{ flex: 1, border: 'none', fontWeight: 600, fontSize: 13, background: 'transparent' }}
              onBlur={(e) => { if (e.target.value.trim() && e.target.value !== f.name) updateFeature(f.id, { name: e.target.value.trim() }); }}
            />
            {f.isCustom && (
              <button className="icon-btn" onClick={() => setConfirmId(f.id)}><Trash2 size={15} /></button>
            )}
          </div>
        ))}
      </div>

      {showNew && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ width: 380 }}>
            <h3>New Custom Feature</h3>
            <p>Custom features get their own icon, color and appear alongside built-in features.</p>

            <div className="field-row">
              <label>Name</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Softener Dosing" />
            </div>

            <div className="field-row">
              <label>Behaviour (drives the profile arrow style)</label>
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as FeatureKind })}>
                <option value="hold">Hold (flat line)</option>
                <option value="heat">Heat (rising diagonal)</option>
                <option value="cool">Cool (falling diagonal)</option>
                <option value="fill">Fill (green up arrow)</option>
                <option value="drain">Drain (orange down arrow)</option>
                <option value="inject">Inject / Dose (green up arrow)</option>
                <option value="circulation">Circulation (yellow parallel band)</option>
                <option value="custom">Generic step</option>
              </select>
            </div>

            <div className="field-row">
              <label>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ICON_CHOICES.map((ic) => (
                  <button
                    key={ic}
                    className="icon-btn"
                    style={{ border: draft.icon === ic ? '2px solid var(--navy-dark)' : '1px solid var(--border)' }}
                    onClick={() => setDraft({ ...draft, icon: ic })}
                  >
                    <FeatureIcon name={ic} size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft({ ...draft, color: c })}
                    style={{ width: 24, height: 24, borderRadius: 6, background: c, border: draft.color === c ? '2px solid #0f172a' : '1px solid transparent' }}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setShowNew(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!draft.name.trim()}
                onClick={() => {
                  addFeature(draft);
                  setDraft({ name: '', icon: 'Settings', color: '#334155', kind: 'custom' });
                  setShowNew(false);
                }}
              >
                Add Feature
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>Delete feature?</h3>
            <p>Existing steps using this feature will keep their data but show as unknown.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteFeature(confirmId); setConfirmId(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
