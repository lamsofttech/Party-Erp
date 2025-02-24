import { useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
    Paper, TextField, IconButton, TablePagination, Snackbar, Alert
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";

interface Member {
    id: number;
    fullName: string;
    email: string;
    country: string;
    phone: string;
    onboarded: string;
    programOption: string;
    reportStatus: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/get_unsigned_contracts.php"; // Replace with actual backend URL

export default function UnsignedContracts() {
    const [members, setMembers] = useState<Member[]>([]);
    const [orderBy, setOrderBy] = useState<keyof Member>("fullName");
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [totalRecords, setTotalRecords] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const fetchMembers = async () => {
        try {
            const response = await fetch(`${API_URL}?page=${page + 1}&search=${search}&orderBy=${orderBy}&order=${order}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const { data, pagination } = await response.json();
            setMembers(data);
            setTotalRecords(pagination.total_records);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [page, orderBy, order]);

    const handleSort = (property: keyof Member) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleExportToExcel = () => {
        setExporting(true);
        setTimeout(() => {
            const worksheet = XLSX.utils.json_to_sheet(members);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Full Members");
            XLSX.writeFile(workbook, "Full_Members.xlsx");
            setExporting(false);
            setSnackbarOpen(true);
        }, 2000);
    };

    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);

    const membershipType = "unsigned-contracts";

    return (
        <main className="min-h-[80vh]">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">Unsigned Contracts Table</p>
            </div>
            <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
                {/* ✅ Export Button */}
                <button onClick={handleExportToExcel} disabled={exporting} className="rounded-lg bg-green-600 text-white py-2 px-4 my-4">
                    {exporting ? "Exporting..." : "Export to Excel"}
                </button>
                {/* ✅ Search Field */}
                <TextField
                    label="Search..."
                    variant="filled"
                    fullWidth
                    sx={{ mb: 2 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {/* ✅ Table */}
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {["#", "Full Name", "Email", "Country", "Phone", "Onboarded", "Program Option", "Status", "Action"].map((label, index) => (
                                    <TableCell key={index}>
                                        {index !== 7 ? (
                                            <TableSortLabel active={orderBy === label} direction={order} onClick={() => handleSort(label as keyof Member)}>
                                                {label}
                                            </TableSortLabel>
                                        ) : label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {members.length > 0 ? (
                                members.map((member, index) => (
                                    <TableRow key={member.id}>
                                        <TableCell>{index + 1 + page * rowsPerPage}</TableCell>
                                        <TableCell>{member.fullName}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.country}</TableCell>
                                        <TableCell>{member.phone}</TableCell>
                                        <TableCell>{member.onboarded}</TableCell>
                                        <TableCell>{member.programOption}</TableCell>
                                        <TableCell>{member.reportStatus}</TableCell>
                                        <TableCell>
                                        <Link to={`/members/${membershipType}/${member.fullName}?email=${member.email}`}>
                                            <IconButton>
                                                <VisibilityIcon color="primary" />
                                            </IconButton>
                                        </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <strong>No Unsigned Contracts</strong>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {/* ✅ Table Pagination */}
                <TablePagination
                    rowsPerPageOptions={[10]}
                    component="div"
                    count={totalRecords}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                />
                {/* ✅ Snackbar for Export Success */}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                >
                    <Alert onClose={() => setSnackbarOpen(false)} severity="success">
                        Export successful!
                    </Alert>
                </Snackbar>
            </Paper>
        </main>
    );
}
