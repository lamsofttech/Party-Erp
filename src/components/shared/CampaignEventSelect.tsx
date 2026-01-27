// src/components/Shared/CampaignEventSelect.tsx
import React, { useState, useEffect } from "react";
import { TextField, MenuItem, CircularProgress } from "@mui/material";
import { mockCampaigns } from "../../data/mockData";
import type { Campaign } from "../../types/campaign";

interface CampaignEventSelectProps {
  label: string;
  selectedCampaignId: string; // kept as string for <select> value
  onSelectCampaign: (campaignId: string) => void;
}

const CampaignEventSelect: React.FC<CampaignEventSelectProps> = ({
  label,
  selectedCampaignId,
  onSelectCampaign,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch campaigns
    const fetchCampaigns = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // ✅ Normalize ID types to match `Campaign` (number)
      const normalized = mockCampaigns.map((c: any) => ({
        ...c,
        id: typeof c.id === "string" ? Number(c.id) : c.id,
      })) as Campaign[];

      setCampaigns(normalized);
      setLoading(false);
    };
    fetchCampaigns();
  }, []);

  return (
    <TextField
      label={label}
      select
      fullWidth
      value={selectedCampaignId}
      onChange={(e) => onSelectCampaign(e.target.value)}
      disabled={loading}
      helperText={loading ? <CircularProgress size={20} /> : ""}
    >
      {loading ? (
        <MenuItem disabled>Loading Campaigns...</MenuItem>
      ) : (
        <>
          <MenuItem key="none" value="">
            <em>None</em>
          </MenuItem>
          {campaigns.map((campaign) => (
            <MenuItem key={campaign.id} value={String(campaign.id)}>
              {campaign.name} ({campaign.status})
            </MenuItem>
          ))}
        </>
      )}
    </TextField>
  );
};

export default CampaignEventSelect;
