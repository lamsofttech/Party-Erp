import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  useTheme,
  CircularProgress,
  Checkbox,
  ListItemText,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Snackbar,
  Alert,
  Divider,
  InputAdornment,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";

// ------------------- Types -------------------
interface User {
  phone_number: string;
  full_name: string;
}
interface CountyLink {
  id?: number;
  county: string;
  whatsapp_link: string;
  active: boolean;
  updated_at?: string;
}

// ------------------- Config -------------------
const sendTypeOptions = [
  { label: "Single Recipient", value: "single" },
  { label: "Group Selection", value: "group" },
  { label: "All Users", value: "all" },
] as const;

type SendType = (typeof sendTypeOptions)[number]["value"];

// List of Kenya's 47 counties
const KENYA_COUNTIES = [
  "Mombasa",
  "Kwale",
  "Kilifi",
  "Tana River",
  "Lamu",
  "Taita-Taveta",
  "Garissa",
  "Wajir",
  "Mandera",
  "Marsabit",
  "Isiolo",
  "Meru",
  "Tharaka-Nithi",
  "Embu",
  "Kitui",
  "Machakos",
  "Makueni",
  "Nyandarua",
  "Nyeri",
  "Kirinyaga",
  "Murang'a",
  "Kiambu",
  "Turkana",
  "West Pokot",
  "Samburu",
  "Trans-Nzoia",
  "Uasin Gishu",
  "Elgeyo-Marakwet",
  "Nandi",
  "Baringo",
  "Laikipia",
  "Nakuru",
  "Narok",
  "Kajiado",
  "Kericho",
  "Bomet",
  "Kakamega",
  "Vihiga",
  "Bungoma",
  "Busia",
  "Siaya",
  "Kisumu",
  "Homa Bay",
  "Migori",
  "Kisii",
  "Nyamira",
  "Nairobi City",
];

// ------------------- API helpers (POST-only endpoint) -------------------
const API_URL = "https://skizagroundsuite.com/API/county_links.php";

/**
 * FIX 1 (TS2411):
 * Keep response permissive with `unknown` while preserving `status`.
 */
type ApiStatus =
  | { status: "ok";[k: string]: unknown }
  | { status: "error"; message: string };

const apiPost = async (
  action: string,
  payload: Record<string, unknown> = {}
) => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = (await res.json()) as ApiStatus;

  if (!res.ok || data.status !== "ok") {
    const msg =
      (data as any)?.message || `Request failed for action "${action}"`;
    throw new Error(msg);
  }

  return data;
};

const normalizeRow = (r: any): CountyLink => ({
  county: r.county,
  whatsapp_link: r.whatsapp_link ?? "",
  active: !!r.active,
  updated_at: r.updated_at,
});

const API = {
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(
      "https://internationalscholarsdev.qhtestingserver.com/ABIS/ABIS/example/get_all_users.php"
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((u: any) => ({
      phone_number: u.phone_number,
      full_name: u.full_name || u.phone_number,
    }));
  },

  listCountyLinks: async (): Promise<CountyLink[]> => {
    const data = await apiPost("list");
    const rows = Array.isArray((data as any).rows) ? (data as any).rows : [];
    return rows.map(normalizeRow);
  },

  upsertCountyLinks: async (rows: CountyLink[]): Promise<boolean> => {
    const payload = {
      rows: rows.map((r) => ({
        county: r.county,
        whatsapp_link: r.whatsapp_link || "",
        active: r.active ? 1 : 0,
      })),
    };
    await apiPost("upsert_bulk", payload);
    return true;
  },

  patchCountyLink: async (
    county: string,
    payload: Partial<CountyLink>
  ): Promise<boolean> => {
    const send: any = { county };
    if (typeof payload.whatsapp_link !== "undefined")
      send.whatsapp_link = payload.whatsapp_link;
    if (typeof payload.active !== "undefined")
      send.active = payload.active ? 1 : 0;
    await apiPost("patch", send);
    return true;
  },

  deleteCountyLink: async (county: string): Promise<boolean> => {
    await apiPost("delete", { county });
    return true;
  },

  getCountyLink: async (county: string): Promise<CountyLink | null> => {
    try {
      const data = await apiPost("get", { county });
      const row = (data as any).row;
      if (!row) return null;
      return normalizeRow(row);
    } catch {
      return null;
    }
  },

  copyCountyLink: async (
    source_county: string,
    target_county: string
  ): Promise<boolean> => {
    await apiPost("copy", { source_county, target_county });
    return true;
  },

  sendWhatsApp: async (message: string, recipients: string[]) => {
    const res = await fetch(
      "https://internationalscholarsdev.qhtestingserver.com/ABIS/ABIS/example/send_whatsapp.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, recipients }),
      }
    );
    return res.json();
  },
};

// ------------------- County Links Manager Tab -------------------
function CountyLinksManager() {
  // (Optional 'dark' computed for future styling; remove if you don't need it)
  const { palette } = useTheme();
  const dark = palette.mode === "dark";
  void dark; // prevents TS6133 if you aren't using `dark` yet

  const [rows, setRows] = useState<CountyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    sev: "success" | "error" | "info";
  }>({ open: false, msg: "", sev: "success" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const server = await API.listCountyLinks();
        const merged: CountyLink[] = KENYA_COUNTIES.map((name) => {
          const found = server.find(
            (r) => r.county.toLowerCase() === name.toLowerCase()
          );
          return found || { county: name, whatsapp_link: "", active: false };
        });
        setRows(merged);
      } catch (e: any) {
        console.error(e);
        setSnack({
          open: true,
          msg: e.message || "Failed to load",
          sev: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        r.county.toLowerCase().includes(filter.toLowerCase())
      ),
    [rows, filter]
  );

  const handleChange = (i: number, patch: Partial<CountyLink>) => {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  };

  const handleSaveOne = async (row: CountyLink) => {
    setSaving(true);
    try {
      await API.patchCountyLink(row.county, {
        whatsapp_link: row.whatsapp_link,
        active: row.active,
      });
      setSnack({ open: true, msg: "Saved.", sev: "success" });
    } catch (e: any) {
      setSnack({ open: true, msg: e.message || "Save failed", sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await API.upsertCountyLinks(rows);
      setSnack({ open: true, msg: "All links saved.", sev: "success" });
    } catch (e: any) {
      setSnack({
        open: true,
        msg: e.message || "Bulk save failed",
        sev: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnack({ open: true, msg: "Copied to clipboard", sev: "success" });
    } catch {
      setSnack({ open: true, msg: "Copy failed", sev: "error" });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        County WhatsApp Links
      </Typography>
      <Typography variant="body2" mb={2}>
        Manage a real-time directory of WhatsApp invite links for all 47
        counties. During registration, the system fetches the latest link for
        the selected county.
      </Typography>

      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <TextField
          placeholder="Search county..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setRows((prev) => [
              { county: "Custom County", whatsapp_link: "", active: false },
              ...prev,
            ]);
            setSnack({
              open: true,
              msg: "Custom row added. Edit county name and save.",
              sev: "info",
            });
          }}
        >
          Add
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={saving}
          onClick={handleSaveAll}
        >
          Save All
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>County</TableCell>
              <TableCell>WhatsApp Invite Link</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Box py={4} textAlign="center">
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow key={`${row.county}-${i}`} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <TextField
                      value={row.county}
                      onChange={(e) =>
                        handleChange(i, { county: e.target.value })
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 420 }}>
                    <TextField
                      fullWidth
                      placeholder="https://chat.whatsapp.com/INVITE_CODE or https://wa.me/message/..."
                      value={row.whatsapp_link}
                      onChange={(e) =>
                        handleChange(i, { whatsapp_link: e.target.value })
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={row.active}
                      onChange={(e) =>
                        handleChange(i, { active: e.target.checked })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Copy link">
                      <span>
                        <IconButton
                          disabled={!row.whatsapp_link}
                          onClick={() => copyToClipboard(row.whatsapp_link)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Open link">
                      <span>
                        <IconButton
                          disabled={!row.whatsapp_link}
                          href={row.whatsapp_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Save">
                      <span>
                        <IconButton
                          onClick={() => handleSaveOne(row)}
                          disabled={saving}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete from server">
                      <span>
                        <IconButton
                          color="error"
                          onClick={async () => {
                            const okConfirm = window.confirm(
                              `Delete ${row.county} link from server?`
                            );
                            if (!okConfirm) return;
                            try {
                              await API.deleteCountyLink(row.county);
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.county === row.county
                                    ? {
                                      ...r,
                                      whatsapp_link: "",
                                      active: false,
                                    }
                                    : r
                                )
                              );
                              setSnack({
                                open: true,
                                msg: "Deleted. Row reset to empty/inactive.",
                                sev: "success",
                              });
                            } catch (e: any) {
                              setSnack({
                                open: true,
                                msg: e.message || "Delete failed",
                                sev: "error",
                              });
                            }
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" gutterBottom>
        Quick Add
      </Typography>
      <Box display="flex" gap={2} flexWrap="wrap">
        <TextField
          select
          label="County"
          size="small"
          sx={{ minWidth: 240 }}
          value={""}
          onChange={() => {
            /* extend here for a custom quick add flow */
          }}
          disabled
          helperText="Use the table above to edit inline, then Save."
        >
          {KENYA_COUNTIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.sev} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ------------------- Outreach Tab -------------------
const WhatsAppOutreachTab: React.FC = () => {
  // FIX (TS6133): don't declare `theme` unless used; we use palette directly
  const { palette } = useTheme();
  const isDark = palette.mode === "dark";

  const [sendType, setSendType] = useState<SendType>("single");
  const [recipient, setRecipient] = useState("");
  const [groupRecipients, setGroupRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (sendType === "single") return;
    setLoadingUsers(true);
    API.getUsers()
      .then(setUsers)
      .catch((err) => console.error("Fetch failed:", err))
      .finally(() => setLoadingUsers(false));
  }, [sendType]);

  /**
   * FIX (TS2322): for multiple Select, event value is `unknown`
   */
  const handleGroupRecipientsChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value;
    setGroupRecipients(
      Array.isArray(value) ? (value as string[]) : String(value).split(",")
    );
  };

  const handleSend = async () => {
    let recipients: string[] = [];
    if (sendType === "single") recipients = [recipient];
    else if (sendType === "group") recipients = groupRecipients;
    else recipients = users.map((u) => u.phone_number);

    if (!message.trim() || recipients.length === 0) {
      alert("Please enter a message and at least one recipient.");
      return;
    }

    try {
      const result = await API.sendWhatsApp(message, recipients);
      console.log("Message send result:", result);
      alert("✅ Messages sent. Check console for result.");
    } catch (err) {
      console.error("Send failed:", err);
      alert("❌ Failed to send messages.");
    }
  };

  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        background: isDark ? "#0c0c0c" : "#f4f6f8",
      }}
    >
      <Typography variant="h4" fontWeight={700} mb={3}>
        WhatsApp Outreach
      </Typography>

      <TextField
        select
        label="Send To"
        value={sendType}
        onChange={(e) => setSendType(e.target.value as SendType)}
        fullWidth
        sx={{ mb: 3 }}
      >
        {sendTypeOptions.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      {sendType === "single" && (
        <TextField
          label="Recipient Phone Number"
          placeholder="+2547XXXXXXXX"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
        />
      )}

      {sendType === "group" && (
        <>
          {loadingUsers ? (
            <CircularProgress />
          ) : users.length === 0 ? (
            <Typography color="error">
              ⚠️ No users found. Check your API.
            </Typography>
          ) : (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="group-recipients-label">
                Select Recipients
              </InputLabel>
              <Select
                labelId="group-recipients-label"
                multiple
                value={groupRecipients}
                label="Select Recipients"
                onChange={handleGroupRecipientsChange}
                renderValue={(selected) =>
                  Array.isArray(selected) ? selected.join(", ") : String(selected)
                }
              >
                {users.map((user, i) => (
                  <MenuItem key={i} value={user.phone_number}>
                    <Checkbox
                      checked={groupRecipients.includes(user.phone_number)}
                    />
                    <ListItemText
                      primary={`${user.full_name} (${user.phone_number})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </>
      )}

      <TextField
        label="Message"
        multiline
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      {sendType !== "single" && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            📋 Preview:{" "}
            {sendType === "all"
              ? `${users.length} users`
              : `${groupRecipients.length} selected`}{" "}
            will receive:
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 1 }}>
            "{message}"
          </Typography>
          <Box
            sx={{
              maxHeight: 200,
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 1,
              p: 1,
            }}
          >
            {(sendType === "all"
              ? users
              : users.filter((u) => groupRecipients.includes(u.phone_number))
            ).map((user, index) => (
              <Typography key={index} variant="body2">
                • {user.full_name} ({user.phone_number})
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Button variant="contained" onClick={handleSend}>
        Send WhatsApp Message
      </Button>
    </Box>
  );
};

// ------------------- Main: Tabs wrapper -------------------
const WhatsAppOutreachWithCountyLinks: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        aria-label="Outreach tabs"
        sx={{ px: 2 }}
      >
        <Tab label="Outreach" />
        <Tab label="County Links" />
      </Tabs>
      {tab === 0 && <WhatsAppOutreachTab />}
      {tab === 1 && <CountyLinksManager />}
    </Box>
  );
};

export default WhatsAppOutreachWithCountyLinks;

// ------------------- Helper for Registration Flow -------------------
export function useCountyWhatsAppLink(county?: string) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!county) return;
    setLoading(true);
    API.getCountyLink(county)
      .then((res) => setLink(res && res.active ? res.whatsapp_link : null))
      .catch(() => setLink(null))
      .finally(() => setLoading(false));
  }, [county]);

  return { link, loading };
}
