// src/analytics/components/GeoSection.tsx
import React, { useState } from "react";
import {
    Box,
    Button,
    Chip,
    Paper,
    Tabs,
    Tab,
    Stack,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from "@mui/material";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";

export default function GeoSection({
    counties,
    constits,
}: {
    counties: React.ReactNode;
    constits: React.ReactNode;
}) {
    const [tab, setTab] = useState(0);

    const stickyHeadingSx = {
        position: "sticky" as const,
        top: { xs: 56, sm: 64 },
        zIndex: (t: any) => t.zIndex.appBar - 1,
        backdropFilter: "blur(6px)",
        bgcolor: "rgba(18,18,18,0.8)",
        borderBottom: "1px solid #333",
        py: 1.5,
    };

    return (
        <>
            <Box sx={stickyHeadingSx}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                >
                    <Typography id="geographical-breakdown" variant="h4" sx={{ fontWeight: "bold" }}>
                        Geographical Breakdown
                    </Typography>
                    <Chip color="primary" variant="outlined" size="small" label="Always visible" />
                    <Box sx={{ flex: 1 }} />
                    <Button
                        component="a"
                        href="#geographical-breakdown"
                        size="small"
                        startIcon={<FilterAltRoundedIcon />}
                    >
                        Jump here
                    </Button>
                </Stack>
            </Box>

            <Paper sx={{ width: "100%", border: "1px solid #333" }}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
                        <Tab label="Counties" />
                        <Tab label="Constituencies" />
                    </Tabs>
                </Box>

                <Box role="tabpanel" hidden={tab !== 0} sx={{ p: 2 }}>
                    {tab === 0 && (
                        <Box sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>County</TableCell>
                                        <TableCell align="right">Total Votes</TableCell>
                                        <TableCell align="right">Rejected Votes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>{counties}</TableBody>
                            </Table>
                        </Box>
                    )}
                </Box>

                <Box role="tabpanel" hidden={tab !== 1} sx={{ p: 2 }}>
                    {tab === 1 && (
                        <Box sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Constituency</TableCell>
                                        <TableCell>County</TableCell>
                                        <TableCell align="right">Total Votes</TableCell>
                                        <TableCell align="right">Rejected Votes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>{constits}</TableBody>
                            </Table>
                        </Box>
                    )}
                </Box>
            </Paper>
        </>
    );
}
