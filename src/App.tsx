import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar, { Page } from './components/Sidebar';
import { UnsavedGuardProvider, useUnsavedGuard } from './context/UnsavedGuard';
import TreatmentList from './components/Treatments/TreatmentList';
import TreatmentBuilder from './components/Treatments/TreatmentBuilder';
import ProgramList from './components/Programs/ProgramList';
import ProgramBuilder from './components/Programs/ProgramBuilder';
import FeatureLibraryView from './components/Features/FeatureLibraryView';
import CategoryManagement from './components/Categories/CategoryManagement';
import PlantManager from './components/Plants/PlantManager';
import SettingsView from './components/Settings/SettingsView';

function Shell() {
  const [page, setPage] = useState<Page>('treatments');
  const [openTreatmentId, setOpenTreatmentId] = useState<string | null | 'new'>(null);
  const [openProgramId, setOpenProgramId] = useState<string | null | 'new'>(null);
  const { requestNavigate } = useUnsavedGuard();

  const navigate = (p: Page) => {
    requestNavigate(() => {
      setPage(p);
      setOpenTreatmentId(null);
      setOpenProgramId(null);
    });
  };

  const openTreatment = (id: string | 'new') => {
    requestNavigate(() => setOpenTreatmentId(id));
  };
  const openProgram = (id: string | 'new') => {
    requestNavigate(() => setOpenProgramId(id));
  };
  const closeTreatment = () => requestNavigate(() => setOpenTreatmentId(null));
  const closeProgram = () => requestNavigate(() => setOpenProgramId(null));

  return (
    <div className="app-shell">
      <Header />
      <Sidebar page={page} onNavigate={navigate} />
      <main className="app-main">
        {page === 'treatments' && (
          openTreatmentId ? (
            <TreatmentBuilder treatmentId={openTreatmentId === 'new' ? null : openTreatmentId} onClose={closeTreatment} />
          ) : (
            <TreatmentList onOpen={openTreatment} />
          )
        )}
        {page === 'programs' && (
          openProgramId ? (
            <ProgramBuilder programId={openProgramId === 'new' ? null : openProgramId} onClose={closeProgram} />
          ) : (
            <ProgramList onOpen={openProgram} />
          )
        )}
        {page === 'features' && <FeatureLibraryView />}
        {page === 'categories' && <CategoryManagement />}
        {page === 'plants' && <PlantManager />}
        {page === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <UnsavedGuardProvider>
      <Shell />
    </UnsavedGuardProvider>
  );
}
