// src/contexts/TurnoutStoreContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface StationTurnout {
  registered: number;
  checkedIn: number;
  lastUpdate: string;
}
type Store = Record<string, StationTurnout>;
type Ctx = {
  turnoutStore: Store;
  incrementCheckedIn: (stationId: string, delta: number) => void;
  setRegisteredCount: (stationId: string, registered: number) => void;
};

const TurnoutStoreCtx = createContext<Ctx | undefined>(undefined);

// demo seeds
const DUMMY_REGISTERED: Record<string, number> = { '1': 1200,'2': 950,'3': 800,'4': 650,'5': 1100,'6': 700 };
const DUMMY_CHECKEDIN: Store = {
  '1': { registered: 1200, checkedIn: 312, lastUpdate: new Date().toISOString() },
  '2': { registered: 950,  checkedIn: 410, lastUpdate: new Date().toISOString() },
  '3': { registered: 800,  checkedIn: 201, lastUpdate: new Date().toISOString() },
  '4': { registered: 650,  checkedIn: 380, lastUpdate: new Date().toISOString() },
  '5': { registered: 1100, checkedIn: 220, lastUpdate: new Date().toISOString() },
  '6': { registered: 700,  checkedIn: 295, lastUpdate: new Date().toISOString() },
};

export const TurnoutStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [turnoutStore, setTurnoutStore] = useState<Store>({ ...DUMMY_CHECKEDIN });

  const incrementCheckedIn = useCallback((stationId: string, delta: number) => {
    setTurnoutStore(prev => {
      const cur = prev[stationId] ?? { registered: DUMMY_REGISTERED[stationId] ?? 0, checkedIn: 0, lastUpdate: '' };
      const cap = Math.min(cur.registered, 500);
      const nextChecked = Math.max(0, Math.min(cap, cur.checkedIn + delta));
      const next = { ...cur, checkedIn: nextChecked, lastUpdate: new Date().toISOString() };
      localStorage.setItem(`turnout:${stationId}`, JSON.stringify(next));
      return { ...prev, [stationId]: next };
    });
  }, []);

  const setRegisteredCount = useCallback((stationId: string, registered: number) => {
    setTurnoutStore(prev => {
      const cur = prev[stationId] ?? { registered: 0, checkedIn: 0, lastUpdate: '' };
      const cap = Math.min(registered, 500);
      const nextChecked = Math.min(cur.checkedIn, cap);
      const next = { registered: cap, checkedIn: nextChecked, lastUpdate: new Date().toISOString() };
      localStorage.setItem(`turnout:${stationId}`, JSON.stringify(next));
      return { ...prev, [stationId]: next };
    });
  }, []);

  const value = useMemo(() => ({ turnoutStore, incrementCheckedIn, setRegisteredCount }), [turnoutStore, incrementCheckedIn, setRegisteredCount]);
  return <TurnoutStoreCtx.Provider value={value}>{children}</TurnoutStoreCtx.Provider>;
};

export const useTurnoutStore = () => {
  const ctx = useContext(TurnoutStoreCtx);
  if (!ctx) throw new Error('useTurnoutStore must be used within TurnoutStoreProvider');
  return ctx;
};
