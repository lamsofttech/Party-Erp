// src/pages/ExamResults.tsx

import React from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const ExamResults: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Exam Results</h2>
            <p>This page will display detailed exam results per candidate here.</p>

            <Button
                onClick={() => navigate(-1)}
                variant="contained"
                sx={{ mt: 2 }}
            >
                Back to Applications
            </Button>
        </div>
    );
};

export default ExamResults;

