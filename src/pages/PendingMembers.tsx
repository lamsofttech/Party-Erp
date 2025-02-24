import { useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
    Paper, TextField, IconButton, TablePagination, Snackbar, Alert
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";

// Define TypeScript Interface for API Response
interface Student {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    country: string;
    programOption: string;
    reportStatus: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/get_pending_members.php";

export default function FullMembers() {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

    // Mapping frontend fields to DB columns
    const columnMapping: Record<keyof Student, string> = {
        id: "id",
        fullName: "fullnames",
        email: "email",
        phone: "phone",
        country: "country",
        programOption: "programOption",
        reportStatus: "reportStatus",
    };

    const [orderBy, setOrderBy] = useState<keyof Student>("fullName");
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [exporting, setExporting] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const fetchStudents = async () => {
        try {
            const orderByDB = columnMapping[orderBy];
            const response = await fetch(`${API_URL}?page=${page + 1}&search=${search}&orderBy=${orderByDB}&order=${order}`);

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const text = await response.text();
            // console.log("API Response:", text);

            const data = JSON.parse(text);

            if (data.status === "success" && Array.isArray(data.data)) {
                const studentsData: Student[] = data.data.map((student: any) => ({
                    id: Number(student.id), // Convert ID to number
                    fullName: student.fullName || "",
                    email: student.email || "",
                    phone: student.phone || "",
                    country: student.country || "Unknown",
                    programOption: student.programOption || "",
                    reportStatus: student.reportStatus || "",
                }));

                const uniqueStudents = [...new Map(studentsData.map(student => [student.id, student])).values()];
                setStudents(uniqueStudents);
                setFilteredStudents(uniqueStudents);
            } else {
                console.error("API Error:", data.message);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [page, orderBy, order]);

    useEffect(() => {
        let sortedData = [...new Map(students.map(student => [student.id, student])).values()]; // Remove duplicates

        // Sorting logic
        sortedData.sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (typeof aValue === "number" && typeof bValue === "number") {
                return order === "asc" ? aValue - bValue : bValue - aValue;
            }

            if (orderBy === "fullName") {
                return order === "asc"
                    ? new Date(aValue).getTime() - new Date(bValue).getTime()
                    : new Date(bValue).getTime() - new Date(aValue).getTime();
            }

            if (typeof aValue === "string" && typeof bValue === "string") {
                return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            return 0;
        });

        const filteredData = sortedData.filter(student =>
            Object.values(student).some(value =>
                value.toString().toLowerCase().includes(search.toLowerCase())
            )
        );

        setFilteredStudents(filteredData);
    }, [search, students, orderBy, order]);

    const handleSort = (property: keyof Student) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleExportToExcel = () => {
        setExporting(true);
        setTimeout(() => {
            const worksheet = XLSX.utils.json_to_sheet(filteredStudents);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Full Members");
            XLSX.writeFile(workbook, "Full_Members.xlsx");
            setExporting(false);
            setSnackbarOpen(true);
        }, 2000);
    };

    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
    const membershipType = "pending-members";

    return (
        <div className="my-10">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">Pending Members Table</p>
            </div>
            <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
                <button
                    className="rounded-lg bg-green-600 text-white py-2 px-4 my-4"
                    onClick={handleExportToExcel}
                    disabled={exporting}
                >
                    {exporting ? "Exporting..." : "Export to Excel"}
                </button>

                <TextField
                    label="Search..."
                    variant="filled"
                    fullWidth
                    sx={{ mb: 2 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {[
                                    { label: "#", key: "id" },
                                    { label: "Full Name", key: "fullName" },
                                    { label: "Email", key: "email" },
                                    { label: "Phone", key: "phone" },
                                    { label: "Country", key: "country" },
                                    { label: "Program Option", key: "programOption" },
                                    { label: "Report Status", key: "reportStatus" },
                                    { label: "Action", key: "" },
                                ].map((col, index) => (
                                    <TableCell key={index}>
                                        {col.key ? (
                                            <TableSortLabel
                                                active={orderBy === col.key}
                                                direction={order}
                                                onClick={() => handleSort(col.key as keyof Student)}
                                            >
                                                {col.label}
                                            </TableSortLabel>
                                        ) : (
                                            col.label
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredStudents.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((student, index) => (
                                <TableRow key={student.id}>
                                    <TableCell>{index + 1 + page * rowsPerPage}</TableCell>
                                    <TableCell>{student.fullName}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell>{student.phone}</TableCell>
                                    <TableCell>{student.country}</TableCell>
                                    <TableCell>{student.programOption}</TableCell>
                                    <TableCell>{student.reportStatus}</TableCell>
                                    <TableCell>
                                        <Link to={`/members/${membershipType}/${student.fullName}?email=${student.email}`}>
                                            <IconButton>
                                                <VisibilityIcon color="primary" />
                                            </IconButton>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ✅ Add Pagination */}
                <TablePagination
                    rowsPerPageOptions={[10]}
                    component="div"
                    count={filteredStudents.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                />
            </Paper>

            {/* ✅ Add Snackbar */}
            <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
                <Alert onClose={() => setSnackbarOpen(false)} severity="success">
                    Export successful!
                </Alert>
            </Snackbar>
        </div>
    );
}
