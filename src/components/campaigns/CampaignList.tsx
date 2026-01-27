import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from '@mui/x-data-grid';
import { Edit, Visibility, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import type { Campaign } from '../../types/campaign'; // { id: number|string, name, status, startDate, endDate, goal, ... }
// ⬇ NEW: filters type coming from CampaignsPage
import type { CampaignScopeFilters } from '../../pages/CampaignsPage';

import { mockCampaigns } from '../../data/mockData';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmationDialog from '../common/ConfirmationDialog';

// Safe date formatter
const formatDate = (value?: string | Date) => {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
};

interface CampaignListProps {
  onEdit: (campaign: Campaign) => void;
  // ⬇ NEW: optional ERP scope filters (national / county / constituency / ward)
  filters?: CampaignScopeFilters;
}

const NoRowsOverlay = () => (
  <Box sx={{ p: 3, textAlign: 'center' }}>
    <Typography variant="body2">No campaigns found.</Typography>
  </Box>
);

const CampaignList = ({ onEdit, filters }: CampaignListProps) => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  useEffect(() => {
    let alive = true;

    const fetchCampaigns = async () => {
      try {
        setLoading(true);

        // Simulate latency; replace with your API call
        // Example when you move to backend:
        // const { data } = await api.get('/campaigns', { params: filters });
        await new Promise((r) => setTimeout(r, 300));

        // Normalize mock data -> Campaign with numeric id
        const normalized: Campaign[] = mockCampaigns.map((m: any, idx: number) => {
          const numericId = typeof m.id === 'number' ? m.id : Number(m.id);
          return {
            ...m,
            id: Number.isFinite(numericId) ? numericId : idx + 1,
          } as Campaign;
        });

        if (alive) {
          // NOTE: For now we don't do region filtering here because mockCampaigns
          // has no county/constituency/ward fields. Once your backend adds them,
          // you can filter here based on `filters`.
          setCampaigns(normalized);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchCampaigns();
    return () => {
      alive = false;
    };
    // ⬇ Re-fetch when ERP filters change (national / county / constituency / ward)
  }, [filters]);

  const handleDeleteClick = useCallback((campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (campaignToDelete) {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignToDelete.id));
      // TODO: await api.delete(`/campaigns/${campaignToDelete.id}`);
    }
    setDeleteDialogOpen(false);
    setCampaignToDelete(null);
  }, [campaignToDelete]);

  // Columns typed with Campaign row
  const columns = useMemo<GridColDef<Campaign>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Campaign Name',
        flex: 2,
        minWidth: 200,
        type: 'string',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        type: 'string', // avoid narrowing to SingleSelect
        renderCell: (params: GridRenderCellParams<Campaign>) => {
          const v = typeof params.value === 'string' ? params.value : '—';

          const color:
            | 'default'
            | 'success'
            | 'info'
            | 'secondary'
            | 'warning'
            | 'error' =
            v === 'Active'
              ? 'success'
              : v === 'Planning'
                ? 'info'
                : v === 'Completed'
                  ? 'default'
                  : v === 'Paused'
                    ? 'warning'
                    : 'secondary';

          return <Chip label={String(v)} color={color} size="small" />;
        },
      },
      {
        field: 'startDate',
        headerName: 'Start Date',
        width: 140,
        type: 'string',
        valueFormatter: ({ value }) => formatDate(value as string),
      },
      {
        field: 'endDate',
        headerName: 'End Date',
        width: 140,
        type: 'string',
        valueFormatter: ({ value }) => formatDate(value as string),
      },
      {
        field: 'goal',
        headerName: 'Goal',
        flex: 1.5,
        minWidth: 250,
        type: 'string',
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        width: 170,
        renderCell: (params: GridRenderCellParams<Campaign>) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="View details">
              <IconButton
                size="small"
                onClick={() => navigate(`/party-operations/${params.row.id}`)}
                color="info"
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit campaign">
              <IconButton
                size="small"
                onClick={() => onEdit(params.row)}
                color="primary"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete campaign">
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(params.row)}
                color="error"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleDeleteClick, navigate, onEdit]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        All Campaigns
      </Typography>

      <DataGrid
        rows={campaigns}
        columns={columns}
        getRowId={(row) => row.id as number} // normalized to number
        pageSizeOptions={[5, 10, 20]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
        disableRowSelectionOnClick
        autoHeight
        sx={{ '&.MuiDataGrid-root': { backgroundColor: 'background.paper' } }}
        slots={{
          noRowsOverlay: NoRowsOverlay,
        }}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={
          campaignToDelete
            ? `Are you sure you want to delete the campaign "${campaignToDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this campaign? This action cannot be undone.'
        }
      />
    </Box>
  );
};

export default CampaignList;
