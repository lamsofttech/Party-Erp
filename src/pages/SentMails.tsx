import { useState } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, TablePagination, IconButton, TextField, Dialog, DialogTitle, DialogContent,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { StudentContext } from "../layouts/view-member";

interface Email {
    id: number;
    subject: string;
    datee: string;
}

const SentMails = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);
    const rowsPerPage = 6; // Show 6 entries per page

    const { student, loading, error } = useContext(StudentContext);

    if (loading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;
    if (!student) return <p className="text-red-500 text-center">Student not found.</p>;

    const filteredEmails = student.emails.filter(email =>
        email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.datee.includes(searchTerm) // Allow search by date as well
    );

    // Handle Pagination
    const handlePageChange = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Function to Open Modal
    const handleOpenModal = (email: Email) => {
        setSelectedEmail(email);
        setModalOpen(true);
    };

    // Function to Close Modal
    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedEmail(null);
    };

    return (
        <Paper className="p-4">
            <p className="font-bold text-center text-[24px] text-[#2164a6] dark:text-blue-300">Sent Mails</p>
            {/* Search Bar */}
            <TextField
                label="Search emails..."
                variant="outlined"
                fullWidth
                className="mb-4"
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Table with Scrollable Body */}
            <TableContainer sx={{ maxHeight: 400 }} className="mt-4"> {/* ✅ Set maxHeight for scrolling */}
                <Table stickyHeader> {/* ✅ Enable sticky header */}
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Email Subject</strong></TableCell>
                            <TableCell><strong>Date</strong></TableCell>
                            <TableCell><strong>Action</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredEmails
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) // Paginate results
                            .map((email) => (
                                <TableRow key={email.id}>
                                    <TableCell>{email.subject}</TableCell>
                                    <TableCell>{email.datee}</TableCell>
                                    <TableCell>
                                        <IconButton color="primary" onClick={() => handleOpenModal(email)}>
                                            <VisibilityIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination Controls */}
            <TablePagination
                component="div"
                count={filteredEmails.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPageOptions={[rowsPerPage]} // Only show 6 rows per page
            />

            {/* Modal for Viewing Email */}
            <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle className="flex justify-between items-center">
                    <span>{selectedEmail?.subject}</span>
                    <IconButton onClick={handleCloseModal} className="hover:bg-red-100">
                        <CloseIcon className="text-red-500" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <p><strong>Date:</strong> {selectedEmail?.datee}</p>
                    <p>{selectedEmail?.subject}</p>
                </DialogContent>
                {/* <DialogActions>
                    <Button onClick={handleCloseModal} color="primary" variant="contained">
                        Close
                    </Button>
                </DialogActions> */}
            </Dialog>
        </Paper>
    );
};

export default SentMails;
