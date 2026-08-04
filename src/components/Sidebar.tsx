import React from 'react';
import { FlaskConical, ListTree, Tags, Factory, Settings as SettingsIcon, LayoutList } from 'lucide-react';

export type Page = 'treatments' | 'programs' | 'features' | 'categories' | 'plants' | 'settings';

const NAV: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'treatments', label: 'Treatments', icon: FlaskConical },
  { id: 'programs', label: 'Programs', icon: LayoutList },
  { id: 'features', label: 'Features', icon: ListTree },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'plants', label: 'Plants', icon: Factory },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  return (
    <nav className="app-sidebar">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
