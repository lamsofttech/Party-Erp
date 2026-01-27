// src/pages/AgentIncidentFormPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Card,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Chip,
    Alert,
    Grid,
    CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";

type IncidentType =
    | "Voter Suppression"
    | "Voter Bribery"
    | "KIEMS Kit Failure"
    | "Form 34A Discrepancy"
    | "Ballot Tampering"
    | "Other";

type IncidentSeverity = "High" | "Medium" | "Low";

type IncidentStatus =
    | "Reported"
    | "Under Review"
    | "Evidence Required"
    | "Case Built"
    | "Closed";

type NavStateStation = {
    id: string;
    name: string;
    county?: string;
    constituency?: string;
    ward?: string;
    registered?: number;
};

const API_BASE_URL = "https://skizagroundsuite.com/API";

const AgentIncidentFormPage: React.FC = () => {
    const { stationId } = useParams();
    const navigate = useNavigate();
    const { state } = useLocation() as { state?: { station?: NavStateStation } };
    const { user } = useUser();

    // 1️⃣ Station from navigation state (preferred when coming from maps / lists)
    const stationFromState = state?.station;

    // 2️⃣ Station fallback from logged-in user context (for /agent/incidents)
    const stationFromUser: NavStateStation | undefined = user
        ? {
            id:
                (user as any).polling_station_id ??
                stationId ??
                (user as any).polling_station_name ??
                "STATION",
            name:
                (user as any).polling_station_name ??
                (stationId ? `Station ${stationId}` : "Station"),
            county: (user as any).county_name ?? (user as any).county,
            constituency:
                (user as any).constituency_name ?? (user as any).constituency,
            ward: (user as any).ward_name ?? (user as any).ward,
            registered: (user as any).registered_voters,
        }
        : undefined;

    // Final station used by page
    const station: NavStateStation | undefined =
        stationFromState ?? stationFromUser;

    const stationName =
        station?.name ?? (stationId ? `Station ${stationId}` : "Station");

    // Agent name (localStorage + fallback to user full_name)
    const [agentName, setAgentName] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const storedName = localStorage.getItem("agentName") ?? "";
        setAgentName(storedName || ((user as any)?.full_name as string) || "");
    }, [user]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<IncidentType>("Voter Suppression");
    const [severity, setSeverity] = useState<IncidentSeverity>("Medium");
    const status: IncidentStatus = "Reported";

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const hasStationContext = !!station;

    const locationLine = useMemo(
        () =>
            [station?.ward, station?.constituency, station?.county]
                .filter(Boolean)
                .join(" • ")
                .toUpperCase(),
        [station]
    );

    const isFormValid =
        hasStationContext &&
        title.trim().length > 0 &&
        description.trim().length > 0 &&
        agentName.trim().length > 0;

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);

        if (!station) {
            setError(
                "Missing station details. Please go back to the agent dashboard and reopen this page."
            );
            return;
        }

        if (!isFormValid) {
            setError(
                "Please fill in the Incident Title, Description and Agent Name before submitting."
            );
            return;
        }

        setSubmitting(true);

        try {
            if (typeof window !== "undefined") {
                localStorage.setItem("agentName", agentName.trim());
            }

            const payload = {
                title: title.trim(),
                description: description.trim(),
                type,
                severity,
                status, // always "Reported" from agent side
                countyCode: station.county ?? "",
                constituencyCode: station.constituency ?? "",
                wardCode: station.ward ?? "",
                pollingStationName: station.name,
                agentName: agentName.trim(),
                stationId: station.id,
            };

            const res = await fetch(`${API_BASE_URL}/submit_incident.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            let json: any = null;
            try {
                json = await res.json();
            } catch {
                json = null;
            }

            if (!res.ok || json?.status !== "success") {
                const message =
                    json?.message ||
                    `Failed to submit incident (HTTP ${res.status}). Please try again.`;
                throw new Error(message);
            }

            setSuccess("Incident submitted. Thank you for reporting.");
            setTitle("");
            setDescription("");
            setType("Voter Suppression");
            setSeverity("Medium");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Unexpected error while submitting incident.";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background:
                    "radial-gradient(circle at top, #ff6b81 0, #ff3b3f 35%, #d4142d 70%, #96081a 100%)",
                px: { xs: 1.5, sm: 2, md: 3 },
                py: { xs: 1.5, sm: 2.5, md: 4 },
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: 640, // narrower for mobile friendliness
                    mx: "auto",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: 1.5, sm: 2 },
                }}
            >
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: { xs: 0.5, sm: 1.5 },
                            gap: 1.5,
                        }}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                variant="overline"
                                sx={{
                                    letterSpacing: 2,
                                    color: "rgba(255,255,255,0.85)",
                                    fontSize: { xs: 10, sm: 11 },
                                }}
                            >
                                POLLING STATION AGENT VIEW
                            </Typography>
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    color: "white",
                                    mt: 0.4,
                                    fontSize: { xs: 20, sm: 24, md: 28 },
                                    lineHeight: 1.1,
                                }}
                            >
                                {stationName}
                            </Typography>
                            {locationLine && (
                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.9)",
                                        mt: 0.3,
                                        fontSize: { xs: 11, sm: 12 },
                                    }}
                                >
                                    {locationLine}
                                </Typography>
                            )}
                        </Box>

                        <Button
                            startIcon={<CloseIcon sx={{ fontSize: 18 }} />}
                            onClick={handleCancel}
                            sx={{
                                color: "white",
                                textTransform: "none",
                                bgcolor: "rgba(0,0,0,0.18)",
                                "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
                                fontSize: 12,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 999,
                                minWidth: "auto",
                            }}
                        >
                            Close
                        </Button>
                    </Box>

                    <Box
                        sx={{
                            mt: { xs: 0.5, sm: 1 },
                            display: "flex",
                            justifyContent: { xs: "flex-start", md: "center" },
                        }}
                    >
                        <Box
                            sx={{
                                px: 2.2,
                                py: 0.7,
                                borderRadius: 999,
                                background:
                                    "linear-gradient(90deg, rgba(0,0,0,0.15), rgba(0,0,0,0.25))",
                                color: "white",
                                fontSize: 11,
                                fontWeight: 500,
                                boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                                maxWidth: "100%",
                            }}
                        >
                            Today: submit incidents for this station only.
                        </Box>
                    </Box>
                </motion.div>

                {/* Main form card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    style={{ flex: 1, display: "flex" }}
                >
                    <Card
                        sx={{
                            mt: { xs: 1.8, sm: 2.5 },
                            borderRadius: 3,
                            px: { xs: 1.8, sm: 2.4, md: 3.2 },
                            py: { xs: 1.8, sm: 2.4, md: 3 },
                            boxShadow: {
                                xs: "0 14px 35px rgba(0,0,0,0.28)",
                                sm: "0 20px 60px rgba(0,0,0,0.32)",
                            },
                            bgcolor: "rgba(255,250,246,0.97)",
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {!hasStationContext && (
                            <Alert severity="error" sx={{ mb: 1.5, fontSize: 13 }}>
                                Station details are missing. Please go back to the agent landing
                                page and reopen Incident Reporting.
                            </Alert>
                        )}

                        {/* Top section */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: { xs: "flex-start", sm: "center" },
                                justifyContent: "space-between",
                                mb: { xs: 2, sm: 2.5 },
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.2 }}>
                                <WarningIcon color="error" sx={{ fontSize: 22 }} />
                                <Box>
                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: { xs: 15, sm: 16 },
                                            mb: 0.2,
                                        }}
                                    >
                                        Add New Incident
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: 12,
                                            color: "text.secondary",
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        Fill in the details below to report any irregularity or
                                        challenge at this polling station.
                                    </Typography>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    textAlign: { xs: "left", sm: "right" },
                                    minWidth: { sm: 140 },
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        color: "text.secondary",
                                        mb: 0.2,
                                    }}
                                >
                                    Logged in as
                                </Typography>
                                <Typography
                                    sx={{ fontWeight: 600, fontSize: 13, mb: 0.2 }}
                                    noWrap
                                >
                                    {agentName || "Agent"}
                                </Typography>
                                {station?.registered && (
                                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                        Registered voters:{" "}
                                        {station.registered.toLocaleString("en-KE")}
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {/* Form fields */}
                        <Grid container spacing={1.5}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Incident Title"
                                    fullWidth
                                    size="small"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    autoComplete="off"
                                    disabled={!hasStationContext}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Description"
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    maxRows={6}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    size="small"
                                    disabled={!hasStationContext}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small" disabled={!hasStationContext}>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        label="Type"
                                        value={type}
                                        onChange={(e) => setType(e.target.value as IncidentType)}
                                    >
                                        <MenuItem value="Voter Suppression">
                                            Voter Suppression
                                        </MenuItem>
                                        <MenuItem value="Voter Bribery">Voter Bribery</MenuItem>
                                        <MenuItem value="KIEMS Kit Failure">
                                            KIEMS Kit Failure
                                        </MenuItem>
                                        <MenuItem value="Form 34A Discrepancy">
                                            Form 34A Discrepancy
                                        </MenuItem>
                                        <MenuItem value="Ballot Tampering">
                                            Ballot Tampering
                                        </MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small" disabled={!hasStationContext}>
                                    <InputLabel>Severity</InputLabel>
                                    <Select
                                        label="Severity"
                                        value={severity}
                                        onChange={(e) =>
                                            setSeverity(e.target.value as IncidentSeverity)
                                        }
                                    >
                                        <MenuItem value="High">High</MenuItem>
                                        <MenuItem value="Medium">Medium</MenuItem>
                                        <MenuItem value="Low">Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Agent Name"
                                    fullWidth
                                    size="small"
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                    disabled={!hasStationContext}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Status"
                                    fullWidth
                                    size="small"
                                    value={status}
                                    InputProps={{ readOnly: true }}
                                />
                            </Grid>

                            {/* Read-only station context */}
                            <Grid item xs={12}>
                                <Box
                                    sx={{
                                        mt: 0.5,
                                        p: 1.2,
                                        borderRadius: 2,
                                        bgcolor: "#fff7f4",
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 0.7,
                                    }}
                                >
                                    <Chip
                                        label={`Station: ${stationName}`}
                                        size="small"
                                        sx={{ fontSize: 11 }}
                                    />
                                    {station?.ward && (
                                        <Chip
                                            label={`Ward: ${station.ward}`}
                                            size="small"
                                            sx={{ fontSize: 11 }}
                                        />
                                    )}
                                    {station?.constituency && (
                                        <Chip
                                            label={`Constituency: ${station.constituency}`}
                                            size="small"
                                            sx={{ fontSize: 11 }}
                                        />
                                    )}
                                    {station?.county && (
                                        <Chip
                                            label={`County: ${station.county}`}
                                            size="small"
                                            sx={{ fontSize: 11 }}
                                        />
                                    )}
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Error / success messages */}
                        {error && (
                            <Alert severity="error" sx={{ mt: 1.8, fontSize: 13 }}>
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert severity="success" sx={{ mt: 1.8, fontSize: 13 }}>
                                {success}
                            </Alert>
                        )}

                        {/* Actions – mobile friendly */}
                        <Box
                            sx={{
                                mt: { xs: 2.2, sm: 2.8 },
                                display: "flex",
                                flexDirection: { xs: "column-reverse", sm: "row" },
                                justifyContent: "flex-end",
                                gap: { xs: 1, sm: 2 },
                            }}
                        >
                            <Button
                                onClick={handleCancel}
                                sx={{
                                    textTransform: "none",
                                    color: "rgba(0,0,0,0.7)",
                                    borderRadius: 999,
                                    fontSize: 13,
                                    py: 1,
                                    width: { xs: "100%", sm: "auto" },
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleSubmit}
                                disabled={submitting || !isFormValid}
                                sx={{
                                    textTransform: "none",
                                    px: { xs: 2.5, sm: 4 },
                                    borderRadius: 999,
                                    fontWeight: 600,
                                    fontSize: 14,
                                    py: 1.1,
                                    width: { xs: "100%", sm: "auto" },
                                }}
                            >
                                {submitting ? (
                                    <CircularProgress size={20} sx={{ color: "white" }} />
                                ) : (
                                    "Submit Incident"
                                )}
                            </Button>
                        </Box>
                    </Card>
                </motion.div>
            </Box>
        </Box>
    );
};

export default AgentIncidentFormPage;
