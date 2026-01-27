// src/components/FiltersBar.tsx
import React from "react";
import {
    Box,
    Stack,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
} from "@mui/material";

export type FiltersBarFilters = {
    query: string;
    parties: string[];
    includeRejected: "all" | "include" | "exclude";
    sortBy: "votes_desc" | "votes_asc";
};

export type FiltersBarProps = {
    title?: string;
    parties: string[];
    filters: FiltersBarFilters;
    onChange: (patch: Partial<FiltersBarProps["filters"]>) => void;
    onReset: () => void;
    anchorId?: string;
};

const FiltersBar: React.FC<FiltersBarProps> = ({
    title = "Filters",
    parties,
    filters,
    onChange,
    onReset,
    anchorId,
}) => {
    return (
        <Box
            id={anchorId}
            sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
            }}
        >
            <Stack spacing={2}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {title}
                    </Typography>

                    <Button variant="outlined" onClick={onReset}>
                        Reset
                    </Button>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                        size="small"
                        label="Search"
                        value={filters.query}
                        onChange={(e) => onChange({ query: e.target.value })}
                        sx={{ minWidth: 260, flex: 1 }}
                    />

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="include-rejected-label">Rejected</InputLabel>
                        <Select
                            labelId="include-rejected-label"
                            label="Rejected"
                            value={filters.includeRejected}
                            onChange={(e) =>
                                onChange({
                                    includeRejected: e.target.value as FiltersBarFilters["includeRejected"],
                                })
                            }
                        >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="include">Include rejected</MenuItem>
                            <MenuItem value="exclude">Exclude rejected</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="sort-by-label">Sort</InputLabel>
                        <Select
                            labelId="sort-by-label"
                            label="Sort"
                            value={filters.sortBy}
                            onChange={(e) =>
                                onChange({
                                    sortBy: e.target.value as FiltersBarFilters["sortBy"],
                                })
                            }
                        >
                            <MenuItem value="votes_desc">Votes (desc)</MenuItem>
                            <MenuItem value="votes_asc">Votes (asc)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                {/* Party chips (optional) */}
                {Array.isArray(parties) && parties.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {parties.map((p) => {
                            const selected = filters.parties.includes(p);
                            return (
                                <Chip
                                    key={p}
                                    label={p}
                                    clickable
                                    variant={selected ? "filled" : "outlined"}
                                    onClick={() => {
                                        const next = selected
                                            ? filters.parties.filter((x) => x !== p)
                                            : [...filters.parties, p];
                                        onChange({ parties: next });
                                    }}
                                    sx={{ mb: 1 }}
                                />
                            );
                        })}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
};

export default FiltersBar;
