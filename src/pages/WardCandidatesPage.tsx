import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, CircularProgress, Alert, Box, Avatar, Button,
    InputBase, InputAdornment
} from '@mui/material';
import { Visibility, Group, ArrowBack, Search, CloudDownload } from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface Candidate {
    id: number;
    name: string;
    contact_email: string;
    contact_phone: string;
    photo_url: string;
    status: string;
    party_name: string;
    position_name: string;
    ward_name: string;
    constituency_name: string;
    county_name: string;
}

const WardCandidatesPage: React.FC = () => {
    const { wardName } = useParams<{ wardCode: string; wardName: string }>();
    const navigate = useNavigate();

    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filterText, setFilterText] = useState<string>('');
    const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);

    const positionId = 8;
    const positionName = "Members of CountyAssembly";

    useEffect(() => {
        const fetchCandidates = async () => {
            if (!wardName) {
                setError("Ward information is missing from the URL.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const url = `https://skizagroundsuite.com/API/fetch_candidates.php?position_id=${positionId}&ward_name=${wardName}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const result = await res.json();
                if (result.status === "success" && Array.isArray(result.data)) {
                    setCandidates(result.data);
                    setFilteredCandidates(result.data);
                } else {
                    throw new Error(result.message || "Failed to fetch candidates.");
                }
            } catch (err) {
                setError(`Failed to load candidates: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setLoading(false);
            }
        };

        fetchCandidates();
    }, [wardName, positionId]);

    useEffect(() => {
        const lowercasedFilter = filterText.toLowerCase();
        const filtered = candidates.filter(candidate =>
            candidate.name.toLowerCase().includes(lowercasedFilter) ||
            candidate.party_name.toLowerCase().includes(lowercasedFilter) ||
            candidate.status.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredCandidates(filtered);
    }, [filterText, candidates]);

    const handleViewDetails = (candidateId: number) => {
        navigate(`/candidate/${candidateId}`);
    };

    const handleExportExcel = () => {
        const exportData = filteredCandidates.map(candidate => ({
            'Candidate Name': candidate.name,
            'Party': candidate.party_name,
            'Status': candidate.status,
            'Contact Email': candidate.contact_email,
            'Contact Phone': candidate.contact_phone,
            'County': candidate.county_name,
            'Constituency': candidate.constituency_name,
            'Ward': candidate.ward_name,
            'Position': candidate.position_name,
            'ID': candidate.id
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
        XLSX.writeFile(workbook, `Candidates_for_${wardName}.xlsx`);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
                <Button onClick={() => navigate(-1)} sx={{ mt: 2 }} startIcon={<ArrowBack />}>
                    Go Back
                </Button>
            </Container>
        );
    }

    return (
        <Container sx={{ mt: 4 }}>
            <Button onClick={() => navigate(-1)} sx={{ mb: 2 }} startIcon={<ArrowBack />}>
                Back to Dashboard
            </Button>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Group sx={{ mr: 1 }} /> {positionName} Candidates for {wardName}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <Paper
                    component="form"
                    sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', flexGrow: 1 }}
                >
                    <InputBase
                        sx={{ ml: 1, flex: 1 }}
                        placeholder="Search candidates..."
                        inputProps={{ 'aria-label': 'search candidates' }}
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        startAdornment={
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        }
                    />
                </Paper>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CloudDownload />}
                    onClick={handleExportExcel}
                    disabled={filteredCandidates.length === 0}
                >
                    Export to Excel
                </Button>
            </Box>

            {filteredCandidates.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    No candidates found matching your filter criteria.
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Photo</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Party</TableCell>
                            <TableCell>Contact</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCandidates.map((candidate) => (
                            <TableRow key={candidate.id}>
                                <TableCell>
                                    <Avatar src={candidate.photo_url} alt={candidate.name} />
                                </TableCell>
                                <TableCell>{candidate.name}</TableCell>
                                <TableCell>{candidate.party_name}</TableCell>
                                <TableCell>
                                    <Typography variant="body2">{candidate.contact_email}</Typography>
                                    <Typography variant="body2">{candidate.contact_phone}</Typography>
                                </TableCell>
                                <TableCell>{candidate.status}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<Visibility />}
                                        onClick={() => handleViewDetails(candidate.id)}
                                    >
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default WardCandidatesPage;
