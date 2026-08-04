import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface GuardState {
  dirty: boolean;
  setDirty: (v: boolean) => void;
  /** Register the current editor's save function so the dialog can offer "Save". */
  setSaveHandler: (fn: (() => Promise<void>) | null) => void;
  /** Ask permission before navigating away. */
  requestNavigate: (proceed: () => void) => void;
}

const Ctx = createContext<GuardState | null>(null);

export function UnsavedGuardProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const setSaveHandler = useCallback((fn: (() => Promise<void>) | null) => {
    saveHandlerRef.current = fn;
  }, []);

  const requestNavigate = useCallback((proceed: () => void) => {
    if (dirtyRef.current) {
      setPending(() => proceed);
    } else {
      proceed();
    }
  }, []);

  const resolvePending = async (action: 'save' | 'discard' | 'cancel') => {
    if (action === 'cancel') { setPending(null); return; }
    if (action === 'save' && saveHandlerRef.current) {
      await saveHandlerRef.current();
    }
    if (pending) {
      setDirty(false);
      pending();
    }
    setPending(null);
  };

  return (
    <Ctx.Provider value={{ dirty, setDirty, setSaveHandler, requestNavigate }}>
      {children}
      {pending && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>You have unsaved changes</h3>
            <p>Save your changes before leaving, or discard them.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => resolvePending('cancel')}>Cancel</button>
              <button className="btn btn-danger" onClick={() => resolvePending('discard')}>Discard</button>
              <button className="btn btn-primary" onClick={() => resolvePending('save')}>Save</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useUnsavedGuard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUnsavedGuard must be used within UnsavedGuardProvider');
  return ctx;
}
