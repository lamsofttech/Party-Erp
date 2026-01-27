// src/pages/FeedbackTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { FeedbackItem } from '../types/feedback';

interface FeedbackTableProps {
  feedback: FeedbackItem[];
  onViewDetails: (item: FeedbackItem) => void;
}

function FeedbackTable({ feedback, onViewDetails }: FeedbackTableProps) {
  return (
    <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
      <Table stickyHeader aria-label="feedback table">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Submission Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>County</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {feedback.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography variant="subtitle1" color="text.secondary" p={2}>
                  No engagements found matching current filters.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            feedback.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.priority}</TableCell>
                <TableCell>
                  {new Date(item.submissionDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{item.county || 'N/A'}</TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      onClick={() => onViewDetails(item)}
                      color="primary"
                      aria-label={`View details for ${item.title}`}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default FeedbackTable;
