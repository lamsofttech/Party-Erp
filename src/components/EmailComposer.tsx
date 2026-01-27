import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  useId,
} from "react";
import {
  Box,
  Container,
  TextField,
  Typography,
  Button,
  Autocomplete,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Chip,
  useMediaQuery,
  Snackbar,
  Tabs,
  Tab,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { AlertColor } from "@mui/material/Alert";

// ✅ Public logo URL (PNG, email-friendly, but red-on-white)
const LOGO_URL = "https://skizagroundsuite.com/img/P1.png";

// ⚡ Lazy-load the rich text editor to keep initial bundle small
const ReactQuill = lazy(() => import("react-quill"));

// Simple email validator for manual addresses
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Load Quill CSS only when editor mounts (helps PWAs)
const useQuillCss = () => {
  useEffect(() => {
    const id = "quill-css";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css";
    document.head.appendChild(link);
    return () => {
      // keep CSS cached; do not remove on unmount
    };
  }, []);
};

interface Member {
  id: number;
  name: string;
  email: string;
}

type Draft = {
  subject: string;
  message: string;
  selectedIds: number[];
  sendToAll: boolean;
  // NOTE: we don't persist attachments in localStorage
};

const MEMBERS_ENDPOINT =
  "https://internationalscholarsdev.qhtestingserver.com/ABIS/members.php?page=1&limit=1000&status=all";

const SEND_ENDPOINT = "https://skizagroundsuite.com/API/ABIS/mail.php";

const DRAFT_KEY = "emailComposer.draft.v1";
const MEMBERS_CACHE_KEY = "emailComposer.members.cache.v1";

// ~10MB total is plenty for emails; adjust to your backend limits if needed
const DEFAULT_MAX_TOTAL_ATTACH_MB = 10;

// 🌐 Jubilee generic email HTML template builder (with logo + subject + footer)
const buildEmailTemplate = (subject: string, contentHtml: string) => {
  const safeSubject = subject || "Jubilee Party Communication";
  const safeContent = contentHtml || "<p><em>(No message content)</em></p>";

  // Main colors
  const red = "#ED1C24";
  const gold = "#F8B400";

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" 
         style="background-color:#f6f6f6;padding:24px 0;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" border="0" 
               style="max-width:640px;background-color:#ffffff;border-radius:14px;
                      overflow:hidden;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto',
                                   'Helvetica Neue',Arial,sans-serif;">

          <!-- HEADER STRIP: white background so red logo pops -->
          <tr>
            <td style="background-color:#ffffff;padding:14px 24px;
                       border-bottom:4px solid ${red};">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${LOGO_URL}" alt="Jubilee Logo"
                         style="height:40px;display:block;" />
                  </td>

                  <td align="right" style="vertical-align:middle;">
                    <span style="
                      display:inline-block;
                      padding:6px 12px;
                      border-radius:999px;
                      background:linear-gradient(120deg, ${red}, ${gold});
                      color:#ffffff;
                      font-size:10px;
                      font-weight:700;
                      letter-spacing:0.12em;
                      text-transform:uppercase;
                      font-family:'Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif;
                    ">
                      Automated Command Center
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SUBJECT BLOCK -->
          <tr>
            <td style="padding:22px 24px 6px 24px;">
              <div style="
                color:${gold};
                font-size:11px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:0.18em;
                margin-bottom:6px;
              ">
               Form Ni Matiangi Political Digital Stategist Official Communication
              </div>

              <h1 style="
                margin:0;
                color:#111111;
                font-size:24px;
                line-height:1.35;
                font-weight:800;
                letter-spacing:0.03em;
                font-family:'Segoe UI','Trebuchet MS','Helvetica Neue',Arial,sans-serif;
              ">
                ${safeSubject}
              </h1>

              <div style="
                margin-top:8px;
                color:${red};
                font-size:12px;
                font-weight:600;
                letter-spacing:0.16em;
                text-transform:uppercase;
              ">
                JUBILEE • DIGITAL • COMMAND
              </div>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:1px solid #ececec;margin:14px 0;">
            </td>
          </tr>

          <!-- EMAIL BODY -->
          <tr>
            <td style="padding:10px 24px 24px 24px;color:#333333;font-size:14px;
                       line-height:1.7;">
              ${safeContent}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:18px 24px 20px 24px;background-color:#fafafa;
                       border-top:1px solid #f0f0f0;">
              <div style="font-size:11px;color:#777777;line-height:1.6;">
                This message was sent via the 
                <strong>Jubilee Digital Command Center</strong>.  
                If you believe you received this in error, please contact the nearest Jubilee office.
              </div>

              <div style="font-size:11px;color:#b0b0b0;margin-top:6px;">
                &copy; ${new Date().getFullYear()} Jubilee Party of Kenya. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  `;
};

// 📣 System pitch subject + body (for officials) – customized for Gen Z + Matiang'i + AI system
const SYSTEM_PITCH_SUBJECT =
  "AI-Powered Campaign Command System by Gen Z Team for Dr. Matiang’i";

const buildSystemPitchBody = () => {
  return `
  <p>Dear Leader,</p>

  <p>
    We are a collective of <strong>Gen Z technologists</strong> – young people who grew up
    inspired by <strong>Dr. Fred Okengo Matiang’i</strong> and shaped by the systems,
    discipline and excellence he championed. We believe it is our turn to give back,
    using the skills he helped plant in us.
  </p>

  <p>
    We have built an <strong>AI-powered campaign command system</strong> designed to help
    rescue the country from the mess it is in – by putting data, structure and strategy
    at the center of politics.
  </p>

  <p>
    Our platform is a full <strong>ERP for campaigns</strong>, built end-to-end to support:
  </p>

  <ul>
    <li><strong>Mobilization & structures</strong> &mdash; organizing supporters, teams and counties from one command center.</li>
    <li><strong>Communication</strong> &mdash; coordinated messaging to members, officials and supporters with automated email and digital channels.</li>
    <li><strong>Agent onboarding & training</strong> &mdash; digital registration, materials and guided workflows.</li>
    <li><strong>Parallel voter data collection</strong> &mdash; structured reporting from polling stations in real time.</li>
    <li><strong>47 AI bots</strong> &mdash; one for each county, designed to monitor IEBC-related data sources and flag discrepancies or unusual patterns.</li>
    <li><strong>24/7 conversation platform</strong> &mdash; a space where every minute, a political discussion can happen, keeping the message alive online.</li>
    <li><strong>Digital war room</strong> &mdash; social media intelligence to track sentiment, narratives and digital attacks and respond with data.</li>
  </ul>

  <p>
    In simple terms, this is a <strong>modern political operating system</strong>: the place where
    strategy, data and execution meet. Politics is now a game of information and speed.
    Voters, narratives and battles have moved online. Our system is built exactly for that reality.
  </p>

  <p>
    We are <strong>products of Dr. Matiang’i’s leadership</strong> – disciplined, data-driven and
    focused on systems. Now we would like him to benefit from the skills and technology
    his generation invested in us.
  </p>

  <p>
    We kindly request an opportunity to <strong>demonstrate this solution live</strong> to you and the team,
    and explore how it can be aligned with your strategy.
  </p>

  <p>
    You can reach us directly on <strong>0757 039 394</strong>. We will be honoured to meet,
    walk you through the platform and refine it together.
  </p>

  <p>
    With regards,<br/>
    <strong>Gen Z Digital Team</strong><br/>
    (Built in Kenya, for a better Kenya)
  </p>
  `;
};

const EmailComposer: React.FC = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm")); // phones

  // Tabs: 0 = Member Broadcast, 1 = System Pitch
  const [activeTab, setActiveTab] = useState<number>(0);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Member[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [sendingPitch, setSendingPitch] = useState(false);
  const [maxTotalAttachMB] = useState(DEFAULT_MAX_TOTAL_ATTACH_MB);

  // manual, non-member emails (broadcast tab)
  const [manualEmailsInput, setManualEmailsInput] = useState("");

  // system pitch tab email
  const [pitchEmail, setPitchEmail] = useState("");

  // toast state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const fileInputId = useId();
  const abortRef = useRef<AbortController | null>(null);

  const showToast = (message: string, severity: AlertColor = "info") => {
    setToast({ open: true, message, severity });
  };

  const handleToastClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Offline awareness for PWA
  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Fetch members with caching + abort safety
  useEffect(() => {
    let ignore = false;
    const cached = sessionStorage.getItem(MEMBERS_CACHE_KEY);
    if (cached) {
      try {
        const parsed: Member[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) setMembers(parsed);
      } catch { }
    }

    const fetchMembers = async () => {
      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(MEMBERS_ENDPOINT, { signal: controller.signal });
        const json = await res.json();
        const key = json.members ? "members" : "dcp_members";
        if (!ignore && json.status === "success" && Array.isArray(json[key])) {
          const mapped: Member[] = json[key].map((m: any) => ({
            id: m.id,
            name: m.full_name,
            email: m.email,
          }));
          setMembers(mapped);
          sessionStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(mapped));
        } else if (!ignore) {
          console.error("API error:", json.message || "Unexpected structure");
          showToast("Failed to load members from server.", "error");
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Failed to load members:", err);
          showToast("Network error loading members.", "error");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMembers();
    return () => {
      ignore = true;
      abortRef.current?.abort();
    };
  }, []);

  // Draft autosave (lightweight + PWA friendly) – only for broadcast tab content
  useEffect(() => {
    const t = setTimeout(() => {
      const draft: Draft = {
        subject,
        message,
        selectedIds: selected.map((s) => s.id),
        sendToAll,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 400);
    return () => clearTimeout(t);
  }, [subject, message, selected, sendToAll]);

  // Restore draft on mount (broadcast tab)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: Draft = JSON.parse(saved);
        setSubject(draft.subject || "");
        setMessage(draft.message || "");
        setSendToAll(!!draft.sendToAll);
        if (Array.isArray(draft.selectedIds) && draft.selectedIds.length > 0) {
          // wait until members are loaded to map IDs -> Member objects
          const applyWhenReady = setInterval(() => {
            if (members.length) {
              const restored = members.filter((m) =>
                draft.selectedIds.includes(m.id)
              );
              setSelected(restored);
              clearInterval(applyWhenReady);
            }
          }, 150);
          setTimeout(() => clearInterval(applyWhenReady), 3000);
        }
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  // Lazy-load editor CSS (kept cached by the browser)
  useQuillCss();

  // Derived helpers for broadcast
  const totalAttachBytes = useMemo(
    () => attachments.reduce((sum, f) => sum + (f?.size || 0), 0),
    [attachments]
  );
  const totalAttachMB = useMemo(
    () => totalAttachBytes / (1024 * 1024),
    [totalAttachBytes]
  );
  const tooBig = totalAttachMB > maxTotalAttachMB;

  // Parse manual emails input into a clean list of valid emails
  const manualEmails = useMemo(() => {
    if (!manualEmailsInput.trim()) return [];
    return Array.from(
      new Set(
        manualEmailsInput
          .split(/[\s,;]+/) // split by spaces, commas, semicolons, newlines
          .map((e) => e.trim())
          .filter((e) => e && EMAIL_REGEX.test(e))
      )
    );
  }, [manualEmailsInput]);

  // Quick summary counts for broadcast UI
  const memberRecipientCount = sendToAll ? members.length : selected.length;
  const totalRecipientCount = memberRecipientCount + manualEmails.length;

  // 📨 Broadcast send handler (existing behavior)
  const handleSendBroadcast = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    const memberEmails = sendToAll
      ? members.map((m) => m.email)
      : selected.map((m) => m.email);

    const receiverList = Array.from(
      new Set([...memberEmails, ...manualEmails])
    );

    if (!trimmedSubject || !trimmedMessage || receiverList.length === 0) {
      showToast(
        "Please fill all fields and add at least one valid recipient.",
        "warning"
      );
      return;
    }
    if (offline) {
      showToast(
        "You’re offline. Draft is saved. Send when back online.",
        "info"
      );
      return;
    }
    if (tooBig) {
      showToast(
        `Attachments exceed limit of ${maxTotalAttachMB} MB. Please remove some files.`,
        "warning"
      );
      return;
    }

    // Build the full Jubilee-styled HTML email
    const emailHtml = buildEmailTemplate(trimmedSubject, message);

    const formData = new FormData();
    formData.append("receiver", JSON.stringify(receiverList));
    formData.append("subject", trimmedSubject);
    formData.append("body", emailHtml); // 👈 send formatted HTML

    // Append files (backend should accept `attachments[]`)
    attachments.forEach((file) =>
      formData.append("attachments[]", file, file.name)
    );

    setSendingBroadcast(true);
    try {
      const res = await fetch(SEND_ENDPOINT, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (result?.success) {
        const count = result.sent_to?.length ?? receiverList.length;
        showToast(`🌀 Email dispatched to ${count} recipient(s).`, "success");

        setSelected([]);
        setSubject("");
        setMessage("");
        setSendToAll(false);
        setAttachments([]);
        setManualEmailsInput("");
        localStorage.removeItem(DRAFT_KEY);
      } else {
        const msg =
          result?.errors?.join(", ") || result?.error || "Unknown error";
        showToast(`Failed to send email: ${msg}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error occurred while sending email.", "error");
    } finally {
      setSendingBroadcast(false);
    }
  };

  // 📨 System pitch send handler (one email, fixed content)
  const handleSendSystemPitch = async () => {
    const target = pitchEmail.trim();

    if (!target || !EMAIL_REGEX.test(target)) {
      showToast("Please enter a valid email for the official.", "warning");
      return;
    }
    if (offline) {
      showToast("You’re offline. Try again when you’re back online.", "info");
      return;
    }

    const pitchBody = buildSystemPitchBody();
    const html = buildEmailTemplate(SYSTEM_PITCH_SUBJECT, pitchBody);

    const formData = new FormData();
    formData.append("receiver", JSON.stringify([target]));
    formData.append("subject", SYSTEM_PITCH_SUBJECT);
    formData.append("body", html);

    setSendingPitch(true);
    try {
      const res = await fetch(SEND_ENDPOINT, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (result?.success) {
        showToast(`🌀 System pitch email sent to ${target}.`, "success");
        setPitchEmail("");
      } else {
        const msg =
          result?.errors?.join(", ") || result?.error || "Unknown error";
        showToast(`Failed to send pitch email: ${msg}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error occurred while sending pitch email.", "error");
    } finally {
      setSendingPitch(false);
    }
  };

  const saveTemplate = () => {
    localStorage.setItem("emailTemplate", JSON.stringify({ subject, message }));
    showToast("Template saved for future campaigns.", "success");
  };

  const loadTemplate = () => {
    const template = localStorage.getItem("emailTemplate");
    if (template) {
      const parsed = JSON.parse(template);
      setSubject(parsed.subject || "");
      setMessage(parsed.message || "");
      showToast("Template loaded.", "info");
    } else {
      showToast("No saved template found.", "info");
    }
  };

  const openPreview = () => setPreviewOpen(true);
  const closePreview = () => setPreviewOpen(false);

  return (
    <Container
      maxWidth="md"
      sx={{
        pb: 10,
        pt: 2,
      }}
    >
      {/* Offline + PWA-friendly banner */}
      {offline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You’re offline. Edits are saved locally. You can send once you’re back
          online.
        </Alert>
      )}

      {/* Attachment size warning (only relevant to broadcast tab) */}
      {tooBig && activeTab === 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Total attachments are {totalAttachMB.toFixed(2)} MB (limit{" "}
          {maxTotalAttachMB} MB).
        </Alert>
      )}

      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          boxShadow: { xs: 0, sm: 2 },
        }}
      >
        {/* Jubilee-flavoured header (UI) */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              component="img"
              src={LOGO_URL}
              alt="Jubilee Logo"
              sx={{
                height: 32,
                width: "auto",
                display: { xs: "none", sm: "block" },
                borderRadius: 1,
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  color: "primary.main",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontFamily:
                    "'Poppins','Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif",
                  fontSize: "0.9rem",
                }}
              >
                Jubilee Email Center
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontFamily:
                    "'Poppins','Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif",
                  fontSize: "0.75rem",
                }}
              >
                Coordinate party communication — <strong>Mbele Pamoja</strong>.
              </Typography>
            </Box>
          </Box>
          <Chip
            label="Jubilee Party"
            color="primary"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              borderRadius: 999,
            }}
          />
        </Stack>

        {/* Tabs for Broadcast vs System Pitch */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2 }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Member Broadcast" />
          <Tab label="System Pitch Email" />
        </Tabs>

        {/* TAB 0: Member Broadcast */}
        {activeTab === 0 && (
          <>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{
                mb: 1,
                fontFamily:
                  "'Poppins','Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif",
              }}
            >
              Targeted emails to a single supporter, a segment of members, or the
              entire Jubilee membership.
            </Typography>

            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  inputProps={{ "aria-label": "Send to all members" }}
                />
              }
              label="Send to all registered members"
            />

            {/* Member-based selection (disabled if sendToAll) */}
            {!sendToAll && (
              <Autocomplete
                multiple
                options={members}
                // don’t portal the popup on mobile (keeps it within viewport)
                disablePortal={isXs}
                filterSelectedOptions
                disableCloseOnSelect
                size="small"
                limitTags={isXs ? 2 : 4}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                value={selected}
                onChange={(_, newValue) => setSelected(newValue)}
                loading={loading}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={
                        isXs ? option.name.split(" ")[0] : `${option.name}`
                      }
                      size="small"
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Member recipients"
                    placeholder="Search Jubilee members"
                    fullWidth
                    margin="normal"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}

            {/* Manual emails field */}
            <TextField
              label="Additional email addresses"
              placeholder="e.g. info@jubileeparty.ke, media@domain.com or one email per line"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              maxRows={4}
              value={manualEmailsInput}
              onChange={(e) => setManualEmailsInput(e.target.value)}
              helperText={
                manualEmails.length
                  ? `Detected ${manualEmails.length} valid email(s). These will be added on top of selected members.`
                  : "Optional: paste comma, space or line-separated emails. Use this for one-off or external contacts."
              }
            />

            {/* Recipient summary */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontFamily:
                  "'Poppins','Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif",
              }}
            >
              Recipients:&nbsp;
              <strong>{memberRecipientCount}</strong> member(s)
              {manualEmails.length ? (
                <>
                  {" "}
                  + <strong>{manualEmails.length}</strong> manual email(s)
                </>
              ) : null}
              {" = "}
              <strong>{totalRecipientCount}</strong> total
            </Typography>

            <TextField
              label="Subject"
              fullWidth
              margin="normal"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              inputProps={{ maxLength: 200 }}
            />

            {/* Rich text editor */}
            <Box mt={2}>
              <Suspense
                fallback={
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <CircularProgress size={24} />
                  </Box>
                }
              >
                <ReactQuill
                  value={message}
                  onChange={setMessage}
                  placeholder="Write your message to Jubilee members..."
                  style={{
                    // better tap targets on mobile
                    minHeight: isXs ? 180 : 220,
                    background: "white",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                  // Keep toolbar compact for mobile
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, false] }],
                      ["bold", "italic", "underline"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["link"],
                      ["clean"],
                    ],
                  }}
                  theme="snow"
                />
              </Suspense>
            </Box>

            {/* Attachments */}
            <Box mt={3}>
              <input
                id={fileInputId}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachments(Array.from(e.target.files));
                  }
                }}
              />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={1}
              >
                <label htmlFor={fileInputId}>
                  <Button
                    variant="outlined"
                    component="span"
                    size={isXs ? "medium" : "small"}
                  >
                    📎 Attach Files
                  </Button>
                </label>
                <Typography variant="caption" color="text.secondary">
                  Total: {totalAttachMB.toFixed(2)} MB{" "}
                  {tooBig ? "(over limit)" : ""}
                </Typography>
              </Stack>

              {attachments.length > 0 && (
                <Box
                  mt={1}
                  sx={{ maxHeight: 160, overflowY: "auto" }}
                  aria-live="polite"
                >
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {attachments.map((file, i) => (
                      <li key={`${file.name}-${i}`}>
                        <Typography variant="body2">
                          {file.name} —{" "}
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>

            {/* Actions */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mt: 3 }}
              useFlexGap
              flexWrap="wrap"
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || offline}
                size={isXs ? "large" : "medium"}
              >
                {sendingBroadcast ? "Sending…" : "Send Jubilee Email"}
              </Button>

              <Button
                variant="outlined"
                onClick={saveTemplate}
                size={isXs ? "large" : "medium"}
              >
                Save as Template
              </Button>

              <Button
                variant="outlined"
                onClick={loadTemplate}
                size={isXs ? "large" : "medium"}
              >
                Load Template
              </Button>

              <Button
                variant="outlined"
                onClick={openPreview}
                size={isXs ? "large" : "medium"}
              >
                Preview
              </Button>
            </Stack>
          </>
        )}

        {/* TAB 1: System Pitch Email */}
        {activeTab === 1 && (
          <>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{
                mb: 2,
                fontFamily:
                  "'Poppins','Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif",
              }}
            >
              Send a <strong>pre-written technology pitch</strong> about the AI-powered
              campaign command system and Gen Z team supporting Dr. Matiang’i. Just
              enter their email and the platform sends a fully formatted pitch.
            </Typography>

            <TextField
              label="Official’s email"
              placeholder="e.g. secretary.general@jubileeparty.ke"
              fullWidth
              margin="normal"
              value={pitchEmail}
              onChange={(e) => setPitchEmail(e.target.value)}
            />

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Email Preview
            </Typography>
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                p: 0,
                borderRadius: 1,
                backgroundColor: "background.default",
                overflow: "hidden",
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: buildEmailTemplate(
                    SYSTEM_PITCH_SUBJECT,
                    buildSystemPitchBody()
                  ),
                }}
              />
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mt: 3 }}
              useFlexGap
              flexWrap="wrap"
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendSystemPitch}
                disabled={sendingPitch || offline}
                size={isXs ? "large" : "medium"}
              >
                {sendingPitch ? "Sending pitch…" : "Send System Pitch Email"}
              </Button>
            </Stack>
          </>
        )}
      </Box>

      {/* Preview dialog — full screen on phones (for broadcast emails only) */}
      <Dialog
        open={previewOpen}
        onClose={closePreview}
        maxWidth="md"
        fullWidth
        fullScreen={isXs}
        scroll="paper"
        aria-labelledby="email-preview-title"
      >
        <DialogTitle id="email-preview-title">Email Preview</DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>
            {subject || "(No subject)"}
          </Typography>

          <Typography variant="subtitle1">Recipients:</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {totalRecipientCount > 0
              ? `${memberRecipientCount} member(s) + ${manualEmails.length} manual email(s) = ${totalRecipientCount} total`
              : "No recipients selected yet"}
          </Typography>

          <Typography variant="subtitle1">📎 Attachments:</Typography>
          {attachments.length > 0 ? (
            <ul style={{ paddingLeft: 16, marginTop: 4 }}>
              {attachments.map((file, i) => (
                <li key={`${file.name}-${i}`}>
                  <Typography variant="body2">
                    {file.name} —{" "}
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </li>
              ))}
            </ul>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No attachments
            </Typography>
          )}

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            📨 Message (formatted as members will see it):
          </Typography>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 0,
              borderRadius: 1,
              mt: 1,
              backgroundColor: "background.default",
              overflow: "hidden",
            }}
          >
            {/* Show full styled email HTML in preview */}
            <div
              dangerouslySetInnerHTML={{
                __html: buildEmailTemplate(
                  subject || "(No subject)",
                  message || "<p><em>(Empty)</em></p>"
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePreview}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Swirl toast (Snackbar) */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleToastClose}
          severity={toast.severity}
          variant="filled"
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            alignItems: "center",
            "& .MuiAlert-icon": {
              fontSize: 22,
            },
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmailComposer;
