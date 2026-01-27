// src/types/index.ts
import type { ReactNode } from 'react';

// --- County (as you defined) ---
export interface County {
  id: number;
  code: string; // e.g., 'KE001', 'KE047'
  name: string; // e.g., 'Mombasa', 'Nairobi'
}

// --- Extra domain types expected by DataCenterPage ---
export interface Constituency {
  id: number;
  name: string;
  countyId: number;
  code?: string;
}

export interface Ward {
  id: number;
  name: string;
  constituencyId: number;
  code?: string;
}

export interface PollingStation {
  id: number;
  name: string;
  wardId: number;
  code?: string;
  registeredVoters?: number;
}

// Which entity is in focus / being edited
export type ItemType = 'county' | 'constituency' | 'ward' | 'pollingStation';

// Form mode state (create vs edit) and current item id
export interface FormModeState {
  mode: 'create' | 'edit';
  itemType: ItemType;
  itemId?: number | null;
}

// Generic confirmation modal state
export interface ConfirmationModalState {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// Parent linking for dependent lists
export interface ParentIds {
  countyId?: number | null;
  constituencyId?: number | null;
  wardId?: number | null;
}

// (Optional) keep your other shared types here too:
export interface Module {
  key: string;
  label: string;
  route: string;
  icon?: ReactNode;
  subItems?: SubMenuItem[];
}
export interface SubMenuItem { key: string; label: string; route: string; }
export interface CountyContextType {
  currentCounty: County | null;
  countyModules: string[];
  loadingCountyData: boolean;
  errorCountyData: string | null;
  fetchCountyData: (countyCode: string) => Promise<void>;
  isModuleEnabled: (moduleKey: string) => boolean;
}
export interface CountyModulesApiResponse { county: County; modules: string[]; }
