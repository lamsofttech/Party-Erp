import { useState } from 'react';
// If you created the reusable modal earlier, import it. Adjust the path as needed.
// import ConfirmationModal from './ConfirmationModal';

/* =========================
   Local Types (unchanged)
   ========================= */

type ItemType = 'county' | 'constituency' | 'ward' | 'pollingStation';

export interface PollingStation {
  id: string;
  name: string;
}

export interface Ward {
  id: string;
  name: string;
  pollingStations: PollingStation[];
}

export interface Constituency {
  id: string;
  name: string;
  wards: Ward[];
}

export interface County {
  id: string;
  name: string;
  constituencies: Constituency[];
}

export interface ParentIds {
  countyId?: string;
  constituencyId?: string;
  wardId?: string;
}

export interface FormModeState {
  isOpen: boolean;
  type: ItemType | '';
  operation: 'create' | 'edit' | '';
  data: County | Constituency | Ward | PollingStation | null;
  parentIds: ParentIds;
}

export interface ConfirmationModalState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
}

/* =========================
   Props for the Page
   ========================= */

interface DataCenterPageProps {
  partyData: County[];
  addCounty: (newCounty: Omit<County, 'id' | 'constituencies'>) => void;
  updateCounty: (updatedCounty: County) => void;
  deleteCounty: (countyId: string) => void;

  addConstituency: (countyId: string, newConstituency: Omit<Constituency, 'id' | 'wards'>) => void;
  updateConstituency: (countyId: string, updatedConstituency: Constituency) => void;
  deleteConstituency: (countyId: string, constituencyId: string) => void;

  addWard: (countyId: string, constituencyId: string, newWard: Omit<Ward, 'id' | 'pollingStations'>) => void;
  updateWard: (countyId: string, constituencyId: string, updatedWard: Ward) => void;
  deleteWard: (countyId: string, constituencyId: string, wardId: string) => void;

  addPollingStation: (countyId: string, constituencyId: string, wardId: string, newPollingStation: Omit<PollingStation, 'id'>) => void;
  updatePollingStation: (countyId: string, constituencyId: string, wardId: string, updatedPollingStation: PollingStation) => void;
  deletePollingStation: (countyId: string, constituencyId: string, wardId: string, pollingStationId: string) => void;
}

/* =========================
   UI Helpers (mobile-first)
   ========================= */

function SectionCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base md:text-lg font-semibold text-gray-900">{title}</h2>
        {actions}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PillButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      {...rest}
      className={`h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium active:scale-[0.99] disabled:opacity-60 ${className}`}
    />
  );
}

function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      {...rest}
      className={`h-10 px-4 rounded-xl border border-gray-300 bg-white text-sm font-medium active:scale-[0.99] ${className}`}
    />
  );
}

/* =========================
   Lists (mobile-friendly)
   ========================= */

function CountyList({
  counties,
  onSelectCounty,
  onEdit,
  onDelete,
}: {
  counties: County[];
  onSelectCounty: (c: County | null) => void;
  onEdit: (type: ItemType, data: County, parentIds?: ParentIds) => void;
  onDelete: (type: ItemType, id: string, parentIds?: ParentIds) => void;
}) {
  if (counties.length === 0) {
    return <p className="text-sm text-gray-500">No counties yet.</p>;
  }
  return (
    <ol className="grid gap-3 md:gap-4" role="list">
      {counties.map((c) => (
        <li key={c.id}>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[15px] md:text-base truncate">{c.name}</h3>
              <p className="text-xs md:text-sm text-gray-600 mt-0.5">{c.constituencies.length} constituenc{c.constituencies.length === 1 ? 'y' : 'ies'}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <GhostButton onClick={() => onSelectCounty(c)}>Open</GhostButton>
              <GhostButton onClick={() => onEdit('county', c)}>Edit</GhostButton>
              <GhostButton onClick={() => onDelete('county', c.id)}>Delete</GhostButton>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ConstituencyList({
  constituencies,
  countyId,
  onSelectConstituency,
  onEdit,
  onDelete,
}: {
  constituencies: Constituency[];
  countyId: string;
  onSelectConstituency: (c: Constituency | null) => void;
  onEdit: (type: ItemType, data: Constituency, parentIds?: ParentIds) => void;
  onDelete: (type: ItemType, id: string, parentIds?: ParentIds) => void;
}) {
  if (constituencies.length === 0) {
    return <p className="text-sm text-gray-500">No constituencies yet.</p>;
  }
  return (
    <ol className="grid gap-3 md:gap-4" role="list">
      {constituencies.map((c) => (
        <li key={c.id}>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[15px] md:text-base truncate">{c.name}</h3>
              <p className="text-xs md:text-sm text-gray-600 mt-0.5">{c.wards.length} ward{c.wards.length === 1 ? '' : 's'}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <GhostButton onClick={() => onSelectConstituency(c)}>Open</GhostButton>
              <GhostButton onClick={() => onEdit('constituency', c, { countyId })}>Edit</GhostButton>
              <GhostButton onClick={() => onDelete('constituency', c.id, { countyId })}>Delete</GhostButton>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function WardList({
  wards,
  countyId,
  constituencyId,
  onSelectWard,
  onEdit,
  onDelete,
}: {
  wards: Ward[];
  countyId: string;
  constituencyId: string;
  onSelectWard: (w: Ward | null) => void;
  onEdit: (type: ItemType, data: Ward, parentIds?: ParentIds) => void;
  onDelete: (type: ItemType, id: string, parentIds?: ParentIds) => void;
}) {
  if (wards.length === 0) {
    return <p className="text-sm text-gray-500">No wards yet.</p>;
  }
  return (
    <ol className="grid gap-3 md:gap-4" role="list">
      {wards.map((w) => (
        <li key={w.id}>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[15px] md:text-base truncate">{w.name}</h3>
              <p className="text-xs md:text-sm text-gray-600 mt-0.5">{w.pollingStations.length} station{w.pollingStations.length === 1 ? '' : 's'}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <GhostButton onClick={() => onSelectWard(w)}>Open</GhostButton>
              <GhostButton onClick={() => onEdit('ward', w, { countyId, constituencyId })}>Edit</GhostButton>
              <GhostButton onClick={() => onDelete('ward', w.id, { countyId, constituencyId })}>Delete</GhostButton>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PollingStationList({
  pollingStations,
  countyId,
  constituencyId,
  wardId,
  onEdit,
  onDelete,
}: {
  pollingStations: PollingStation[];
  countyId: string;
  constituencyId: string;
  wardId: string;
  onEdit: (type: ItemType, data: PollingStation, parentIds?: ParentIds) => void;
  onDelete: (type: ItemType, id: string, parentIds?: ParentIds) => void;
}) {
  if (pollingStations.length === 0) {
    return <p className="text-sm text-gray-500">No polling stations yet.</p>;
  }
  return (
    <ol className="grid gap-3 md:gap-4" role="list">
      {pollingStations.map((p) => (
        <li key={p.id}>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[15px] md:text-base truncate">{p.name}</h3>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <GhostButton onClick={() => onEdit('pollingStation', p, { countyId, constituencyId, wardId })}>Edit</GhostButton>
              <GhostButton onClick={() => onDelete('pollingStation', p.id, { countyId, constituencyId, wardId })}>Delete</GhostButton>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* =========================
   Simple Item Form (bottom sheet style)
   ========================= */

function ItemForm({
  type,
  operation,
  initialData,
  parentIds,
  onSubmit,
  onCancel,
}: {
  type: ItemType;
  operation: 'create' | 'edit';
  initialData: County | Constituency | Ward | PollingStation | null;
  parentIds: ParentIds;
  onSubmit: (
    formData: any,
    type: ItemType,
    operation: 'create' | 'edit',
    parentIds: ParentIds
  ) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialData?.name ?? '');

  const title =
    (operation === 'create' ? 'Create ' : 'Edit ') +
    (type === 'county'
      ? 'County'
      : type === 'constituency'
      ? 'Constituency'
      : type === 'ward'
      ? 'Ward'
      : 'Polling Station');

  const submit = () => {
    const payload =
      operation === 'create' ? { name } : { ...(initialData as any), name };
    onSubmit(payload, type, operation, parentIds);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="w-full md:w-[520px] max-w-full md:max-w-[90vw] bg-white text-gray-900 rounded-t-2xl md:rounded-2xl shadow-xl p-4 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="md:hidden mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" aria-hidden />
        <h3 className="text-lg md:text-xl font-semibold">{title}</h3>
        <div className="mt-3 grid gap-2">
          <label className="text-sm text-gray-600" htmlFor="name">Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter name"
          />
        </div>
        <div className="mt-5 grid grid-cols-1 md:flex md:justify-end gap-3">
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PillButton onClick={submit}>{operation === 'create' ? 'Create' : 'Save'}</PillButton>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Lightweight Confirmation Modal (fallback)
   ========================= */

function InlineConfirmationModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-4 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="md:hidden mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" aria-hidden />
        <p className="text-sm md:text-base text-gray-800">{message}</p>
        <div className="mt-5 grid grid-cols-1 md:flex md:justify-end gap-3">
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PillButton className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>Confirm</PillButton>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main Page Component
   ========================= */

const DataCenterPage = ({
  partyData,
  addCounty, updateCounty, deleteCounty,
  addConstituency, updateConstituency, deleteConstituency,
  addWard, updateWard, deleteWard,
  addPollingStation, updatePollingStation, deletePollingStation,
}: DataCenterPageProps) => {
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<Constituency | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  const [formMode, setFormMode] = useState<FormModeState>({
    isOpen: false,
    type: '',
    operation: '',
    data: null,
    parentIds: {},
  });

  const [modal, setModal] = useState<ConfirmationModalState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const resetToAll = () => {
    setSelectedCounty(null);
    setSelectedConstituency(null);
    setSelectedWard(null);
  };

  const handleCreateNew = (type: ItemType, parentIds: ParentIds = {}) => {
    setFormMode({ isOpen: true, type, operation: 'create', data: null, parentIds });
  };

  const handleEdit = (type: ItemType, data: County | Constituency | Ward | PollingStation, parentIds: ParentIds = {}) => {
    setFormMode({ isOpen: true, type, operation: 'edit', data, parentIds });
  };

  const handleDelete = (type: ItemType, id: string, parentIds: ParentIds = {}) => {
    const itemName = type === 'county' ? 'county' : type === 'constituency' ? 'constituency' : type === 'ward' ? 'ward' : 'polling station';
    setModal({
      isOpen: true,
      message: `Are you sure you want to delete this ${itemName}? This action cannot be undone.`,
      onConfirm: () => {
        if (type === 'county') {
          deleteCounty(id);
          if (selectedCounty?.id === id) setSelectedCounty(null);
          setSelectedConstituency(null);
          setSelectedWard(null);
        } else if (type === 'constituency') {
          if (parentIds.countyId) deleteConstituency(parentIds.countyId, id);
          if (selectedConstituency?.id === id) setSelectedConstituency(null);
          setSelectedWard(null);
        } else if (type === 'ward') {
          if (parentIds.countyId && parentIds.constituencyId) deleteWard(parentIds.countyId, parentIds.constituencyId, id);
          if (selectedWard?.id === id) setSelectedWard(null);
        } else if (type === 'pollingStation') {
          if (parentIds.countyId && parentIds.constituencyId && parentIds.wardId) {
            deletePollingStation(parentIds.countyId, parentIds.constituencyId, parentIds.wardId, id);
          }
        }
        setModal({ isOpen: false, message: '', onConfirm: () => {} });
      },
    });
  };

  const handleSubmitForm = (
    formData: any,
    type: ItemType,
    operation: 'create' | 'edit',
    parentIds: ParentIds
  ) => {
    if (operation === 'create') {
      if (type === 'county') {
        addCounty(formData);
      } else if (type === 'constituency') {
        if (parentIds.countyId) addConstituency(parentIds.countyId, formData);
      } else if (type === 'ward') {
        if (parentIds.countyId && parentIds.constituencyId) addWard(parentIds.countyId, parentIds.constituencyId, formData);
      } else if (type === 'pollingStation') {
        if (parentIds.countyId && parentIds.constituencyId && parentIds.wardId) {
          addPollingStation(parentIds.countyId, parentIds.constituencyId, parentIds.wardId, formData);
        }
      }
    } else {
      const updatedData = formData as County | Constituency | Ward | PollingStation;
      if (type === 'county') {
        updateCounty(updatedData as County);
      } else if (type === 'constituency') {
        if (parentIds.countyId) updateConstituency(parentIds.countyId, updatedData as Constituency);
      } else if (type === 'ward') {
        if (parentIds.countyId && parentIds.constituencyId) updateWard(parentIds.countyId, parentIds.constituencyId, updatedData as Ward);
      } else if (type === 'pollingStation') {
        if (parentIds.countyId && parentIds.constituencyId && parentIds.wardId) {
          updatePollingStation(parentIds.countyId, parentIds.constituencyId, parentIds.wardId, updatedData as PollingStation);
        }
      }
    }
    setFormMode({ isOpen: false, type: '', operation: '', data: null, parentIds: {} });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Sticky header / breadcrumbs */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-2">
          <h1 className="text-base md:text-lg font-bold">Political Party Data Center</h1>
          <div className="ml-auto flex items-center gap-2">
            <GhostButton onClick={resetToAll}>View All Counties</GhostButton>
            {selectedCounty && (
              <GhostButton onClick={() => { setSelectedConstituency(null); setSelectedWard(null); }}>Back to {selectedCounty.name}</GhostButton>
            )}
            {selectedConstituency && (
              <GhostButton onClick={() => setSelectedWard(null)}>Back to {selectedConstituency.name}</GhostButton>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 grid gap-4 md:gap-6">
        {/* Counties */}
        {!selectedCounty && (
          <SectionCard
            title="Counties"
            actions={<PillButton onClick={() => handleCreateNew('county')}>Add New County</PillButton>}
          >
            <CountyList
              counties={partyData}
              onSelectCounty={setSelectedCounty}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </SectionCard>
        )}

        {/* Constituencies */}
        {selectedCounty && !selectedConstituency && (
          <SectionCard
            title={`Constituencies in ${selectedCounty.name}`}
            actions={<PillButton onClick={() => handleCreateNew('constituency', { countyId: selectedCounty.id })}>Add New Constituency</PillButton>}
          >
            <ConstituencyList
              constituencies={selectedCounty.constituencies}
              countyId={selectedCounty.id}
              onSelectConstituency={setSelectedConstituency}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </SectionCard>
        )}

        {/* Wards */}
        {selectedConstituency && !selectedWard && (
          <SectionCard
            title={`Wards in ${selectedConstituency.name}`}
            actions={<PillButton onClick={() => handleCreateNew('ward', { countyId: selectedCounty?.id, constituencyId: selectedConstituency.id })}>Add New Ward</PillButton>}
          >
            <WardList
              wards={selectedConstituency.wards}
              countyId={selectedCounty?.id || ''}
              constituencyId={selectedConstituency.id}
              onSelectWard={setSelectedWard}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </SectionCard>
        )}

        {/* Polling Stations */}
        {selectedWard && (
          <SectionCard
            title={`Polling Stations in ${selectedWard.name}`}
            actions={<PillButton onClick={() => handleCreateNew('pollingStation', { countyId: selectedCounty?.id, constituencyId: selectedConstituency?.id, wardId: selectedWard.id })}>Add New Polling Station</PillButton>}
          >
            <PollingStationList
              pollingStations={selectedWard.pollingStations}
              countyId={selectedCounty?.id || ''}
              constituencyId={selectedConstituency?.id || ''}
              wardId={selectedWard.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </SectionCard>
        )}
      </main>

      {/* Forms & Confirmations */}
      {formMode.isOpen && (
        <ItemForm
          type={formMode.type as ItemType}
          operation={formMode.operation as 'create' | 'edit'}
          initialData={formMode.data}
          parentIds={formMode.parentIds}
          onSubmit={handleSubmitForm}
          onCancel={() => setFormMode({ isOpen: false, type: '', operation: '', data: null, parentIds: {} })}
        />
      )}

      {modal.isOpen && (
        // If you imported your reusable ConfirmationModal, use it here instead of InlineConfirmationModal
        <InlineConfirmationModal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal({ isOpen: false, message: '', onConfirm: () => {} })}
        />
      )}
    </div>
  );
};

export default DataCenterPage;
