// src/components/campaigns/CampaignForm.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { mockCampaigns } from "../../data/mockData";

// Keep status values consistent with CampaignDetail and mock data
type CampaignStatus = "Active" | "Planned" | "Completed" | "Archived";

// Local type aligned with fields used in the app and mockData
export interface CampaignLike {
  id: string;
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  description: string;
  leadManager: string;
  budgetSpent: number;
  budgetAllocated: number;
  volunteersCount: number;
}

const emptyCampaign = (id: string): CampaignLike => ({
  id,
  name: "",
  status: "Planned",
  startDate: "",
  endDate: "",
  description: "",
  leadManager: "",
  budgetSpent: 0,
  budgetAllocated: 0,
  volunteersCount: 0,
});

// Accept: full object, just the id string, null, or undefined
type CampaignProp = CampaignLike | string | null | undefined;

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
  /** Optional: pass when editing; omit when creating */
  campaign?: CampaignProp;
}

const CampaignForm = ({ open, onClose, campaign = null }: CampaignFormProps) => {
  // Normalize whatever was passed in
  const campaignId = useMemo(() => {
    if (!campaign) return undefined;
    return typeof campaign === "string" ? campaign : campaign.id;
  }, [campaign]);

  const campaignObj = useMemo<CampaignLike | null>(() => {
    if (!campaign) return null;
    return typeof campaign === "string" ? { ...emptyCampaign(campaign), id: campaign } : campaign;
  }, [campaign]);

  // If editing, use the existing ID; if creating, generate a new string ID
  const initialId = useMemo(() => campaignId ?? Date.now().toString(), [campaignId]);

  const [form, setForm] = useState<CampaignLike>(campaignObj ?? emptyCampaign(initialId));
  const isEdit = Boolean(campaignObj);

  useEffect(() => {
    setForm(campaignObj ?? emptyCampaign(initialId));
  }, [campaignObj, initialId]);

  const handleChange =
    <K extends keyof CampaignLike>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (key === "budgetAllocated" || key === "budgetSpent" || key === "volunteersCount") {
        const num = value === "" ? 0 : Number(value);
        setForm((prev) => ({ ...prev, [key]: Number.isNaN(num) ? 0 : num } as CampaignLike));
      } else if (key === "status") {
        setForm((prev) => ({ ...prev, status: value as CampaignStatus }));
      } else {
        setForm((prev) => ({ ...prev, [key]: value as CampaignLike[K] }));
      }
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update in-memory list (mock)
    const list = mockCampaigns as unknown as CampaignLike[];
    const idx = list.findIndex((c) => c.id === form.id);

    if (idx >= 0) {
      list[idx] = { ...form };
    } else {
      list.push({ ...form });
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? "Edit Campaign" : "Create Campaign"}</DialogTitle>

      <DialogContent dividers>
        <Box component="form" id="campaign-form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Campaign Name"
                value={form.name}
                onChange={handleChange("name")}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Status"
                value={form.status}
                onChange={handleChange("status")}
                fullWidth
              >
                {(["Planned", "Active", "Completed", "Archived"] as CampaignStatus[]).map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={handleChange("startDate")}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                type="date"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={handleChange("endDate")}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={form.description}
                onChange={handleChange("description")}
                fullWidth
                multiline
                minRows={3}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Lead Manager"
                value={form.leadManager}
                onChange={handleChange("leadManager")}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                type="number"
                label="Volunteers Count"
                value={form.volunteersCount}
                onChange={handleChange("volunteersCount")}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                type="number"
                label="Budget Allocated (KES)"
                value={form.budgetAllocated}
                onChange={handleChange("budgetAllocated")}
                fullWidth
                inputProps={{ min: 0, step: 1000 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                type="number"
                label="Budget Spent (KES)"
                value={form.budgetSpent}
                onChange={handleChange("budgetSpent")}
                fullWidth
                inputProps={{ min: 0, step: 1000 }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="campaign-form" variant="contained" startIcon={<Save />}>
          {isEdit ? "Save Changes" : "Create Campaign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignForm;
