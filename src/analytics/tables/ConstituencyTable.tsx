// src/analytics/components/tables/ConstituencyTable.tsx
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
export default function ConstituencyTable({ children }: { children: React.ReactNode }) {
    return (
        <TableContainer sx={{ maxHeight: 520 }}>
            <Table stickyHeader size="small" aria-label="constituency results table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Constituency Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>County</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Total Votes</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Rejected Votes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>{children}</TableBody>
            </Table>
        </TableContainer>
    );
}
