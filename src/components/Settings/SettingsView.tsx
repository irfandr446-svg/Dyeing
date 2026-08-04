import React from 'react';
import { firebaseReady } from '../../firebase';
import { useApp } from '../../context/AppContext';

export default function SettingsView() {
  const { plants, categories, features, treatments, programs } = useApp();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Company Style Textile · Department Process &amp; Machine R&amp;D</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Data connection</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Firestore: <strong style={{ color: firebaseReady ? 'var(--green)' : 'var(--red)' }}>
            {firebaseReady ? 'Connected' : 'Not configured — copy .env.example to .env'}
          </strong>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Data summary</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          {plants.length} Plants · {categories.length} Categories · {features.length} Features<br />
          {treatments.length} Treatments · {programs.length} Programs
        </div>
      </div>
    </div>
  );
}
