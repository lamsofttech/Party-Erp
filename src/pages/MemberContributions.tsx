import { useState } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, TablePagination, TextField
} from "@mui/material";
import { useContext } from "react";
import { StudentContext } from "../layouts/view-member";

// interface Payment {
//     payment_intent_id: string;
//     purpose: string;
//     amount: number;
//     date_completed: string;
// }

const MemberContributions = () => {
    const { student, loading, error } = useContext(StudentContext);

    if (loading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;
    if (!student) return <p className="text-red-500 text-center">Student not found.</p>;

    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);
    const rowsPerPage = 6; // Show 6 entries per page

    // Filter payments based on search query
    const filteredPayments = student.payments.filter(payment =>
        payment.payment_intent_id.includes(searchTerm) ||
        payment.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.amount.toString().includes(searchTerm) ||
        payment.date_completed.includes(searchTerm) // Allow search by date
    );

    // Handle Pagination
    const handlePageChange = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    return (
        <Paper className="p-4">
            <p className="font-bold text-center text-[24px] text-[#2164a6] dark:text-blue-300">Contributions to the program</p>
            {/* Search Bar */}
            <TextField
                label="Search payments..."
                variant="outlined"
                fullWidth
                className="mb-4"
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Table with Sticky Header */}
            <TableContainer sx={{ maxHeight: 400 }} className="mt-4">
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Receipt No.</strong></TableCell>
                            <TableCell><strong>Purpose</strong></TableCell>
                            <TableCell><strong>Amount ($)</strong></TableCell>
                            <TableCell><strong>Date</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredPayments
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) // Paginate results
                            .map((payment) => (
                                <TableRow key={payment.payment_intent_id}>
                                    <TableCell>{payment.payment_intent_id}</TableCell>
                                    <TableCell>{payment.purpose}</TableCell>
                                    <TableCell>${payment.amount}</TableCell>
                                    <TableCell>{payment.date_completed}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Controls */}
            <TablePagination
                component="div"
                count={filteredPayments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPageOptions={[rowsPerPage]} // Only show 6 rows per page
            />
        </Paper>
    );
};

export default MemberContributions;
