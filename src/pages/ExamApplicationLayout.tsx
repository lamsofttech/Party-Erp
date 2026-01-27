import React from "react";
import { Outlet, Link } from "react-router-dom";
import { Button } from "@mui/material";

const PresidentAnalysisLayout: React.FC = () => {
  return (
    <main className="min-h-[80vh] p-4">
      <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4 flex justify-between items-center px-4">
        <p className="font-bold text-[24px] text-white py-4 text-center">
          Presidential Candidates Analysis
        </p>
        <div className="flex gap-2">
          {/* Button to view the candidate list */}
          <Button
            component={Link}
            to="/president-analysis"
            variant="contained"
            color="primary"
          >
            Candidate List
          </Button>

          {/* Button to view results */}
          <Button
            component={Link}
            to="president-results"
            variant="contained"
            color="secondary"
          >
            View Results
          </Button>
        </div>
      </div>

      {/* This is where child pages will appear */}
      <Outlet />
    </main>
  );
};

export default PresidentAnalysisLayout;
