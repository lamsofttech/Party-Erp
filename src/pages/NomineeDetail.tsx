import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Divider,
  Grid,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface Nominee {
    id: string;
    full_name: string;
    national_id: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    email: string;
    position: string;
    county: string;
    constituency: string;
    ward: string;
    membership_number: string;
    membership_status: string;
    date_joined: string;
    status: string;
    created_at: string;
    updated_at: string;
}

const NomineeDetail = () => {
    const { state } = useLocation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [nominee, setNominee] = useState<Nominee | null>(state?.nominee || null);
    const [loading, setLoading] = useState(!state?.nominee);

    useEffect(() => {
        const fetchNominees = async () => {
            try {
                const response = await fetch("https://skizagroundsuite.com/API/fetch_nominees.php");
                const json = await response.json();

                if (json.status === "success") {
                    const foundNominee = json.data.find((n: Nominee) => n.id === id);
                    setNominee(foundNominee || null);
                } else {
                    console.error("Error fetching nominees:", json.message);
                    setNominee(null);
                }
            } catch (error) {
                console.error("Fetch error:", error);
                setNominee(null);
            } finally {
                setLoading(false);
            }
        };

        if (!state?.nominee) {
            fetchNominees();
        }
    }, [id, state]);

    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress color="primary" />
                <Typography variant="body2" color="text.secondary" mt={2}>
                    Loading nominee details...
                </Typography>
            </Container>
        );
    }

    if (!nominee) {
        return (
            <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
                <Typography variant="h6" color="error">
                    No nominee data found.
                </Typography>
                <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                    Back
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    {nominee.full_name}
                </Typography>
                <Chip label={nominee.status} color="primary" sx={{ mb: 2 }} />

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>National ID:</strong> {nominee.national_id}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Date of Birth:</strong> {nominee.date_of_birth}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Gender:</strong> {nominee.gender}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Phone:</strong> {nominee.phone}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Email:</strong> {nominee.email}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Position:</strong> {nominee.position}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>County:</strong> {nominee.county}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Constituency:</strong> {nominee.constituency || "-"}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Ward:</strong> {nominee.ward || "-"}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Membership Number:</strong> {nominee.membership_number}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Membership Status:</strong> {nominee.membership_status}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Date Joined:</strong> {nominee.date_joined}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Created At:</strong> {nominee.created_at}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography><strong>Updated At:</strong> {nominee.updated_at}</Typography>
                    </Grid>
                </Grid>

                <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate(-1)}>
                    Back
                </Button>
            </Paper>
        </Container>
    );
};

export default NomineeDetail;
