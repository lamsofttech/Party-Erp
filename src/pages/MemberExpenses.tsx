import { useState } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, TablePagination, TextField
} from "@mui/material";
import { useContext } from "react";
import { StudentContext } from "../layouts/view-member";

const MemberExpenses = () => {
    const { student, loading, error } = useContext(StudentContext);

    if (loading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;
    if (!student) return <p className="text-red-500 text-center">Student not found.</p>;

    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);
    const rowsPerPage = 6; // Show 6 entries per page

    // Filter expenses based on search query
    const filteredExpenses = student.expenditure.filter(expense =>
        expense.reference_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.purporse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.amount.toString().includes(searchTerm) ||
        expense.date.includes(searchTerm) // Allow search by date
    );

    // Handle Pagination
    const handlePageChange = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    return (
        <Paper className="p-4">
            <p className="font-bold text-center text-[24px] text-[#2164a6] dark:text-blue-300">Expenses Incurred</p>
            {/* Search Bar */}
            <TextField
                label="Search expenses..."
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
                            <TableCell><strong>Reference</strong></TableCell>
                            <TableCell><strong>Expense For</strong></TableCell>
                            <TableCell><strong>Amount ($)</strong></TableCell>
                            <TableCell><strong>Date</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredExpenses
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) // Paginate results
                            .map((expense) => (
                                <TableRow key={expense.reference_id}>
                                    <TableCell>{expense.reference_id}</TableCell>
                                    <TableCell>{expense.purporse}</TableCell>
                                    <TableCell>${expense.amount.toFixed(2)}</TableCell>
                                    <TableCell>{expense.date}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Controls */}
            <TablePagination
                component="div"
                count={filteredExpenses.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPageOptions={[rowsPerPage]} // Only show 6 rows per page
            />
        </Paper>
    );
};

export default MemberExpenses;
