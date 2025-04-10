import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    IconButton,
    Box,
    Chip
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import * as XLSX from "xlsx";

interface Application {
    id: number;
    member_no: string;
    full_name: string;
    kap_email: string;
    university: string;
    program: string;
    status: number;
    sop: string;
    assigned_to: string;
    sn?: number;
    prop_id: string;
}

const AssignedApplications: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const userId = "4";

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/assigned_applications.php";

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            setFilteredApplications(
                applications.filter(
                    (app) =>
                        app.member_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.kap_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.program.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    const fetchApplications = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=get_applications`);
            if (response.data.success) {
                const appsWithSn = response.data.applications.map((app: Application, index: number) => ({
                    ...app,
                    sn: index + 1,
                }));
                setApplications(appsWithSn);
                setFilteredApplications(appsWithSn);
            } else {
                console.error("Error fetching applications:", response.data.message);
            }
        } catch (error) {
            console.error("Error connecting to server:", error);
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    const handleExportExcel = () => {
        const exportData = filteredApplications.map((app) => ({
            ID: app.sn,
            "Member No": app.member_no,
            "Full Name": app.full_name,
            "KAP Email": app.kap_email,
            University: app.university,
            Program: app.program,
            Status: getStatusText(app.status),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
        XLSX.writeFile(workbook, "school_applications.xlsx");
    };

    const getStatusText = (status: number) => {
        switch (status) {
            case 1: return "New";
            case 2: return "Start Application";
            case 3: return "On Progress";
            case 4: return "Pending Approval";
            default: return "Unknown";
        }
    };

    const columns: GridColDef[] = [
        { field: "sn", headerName: "ID", width: 70 },
        { field: "member_no", headerName: "Member No", flex: 1 },
        { field: "full_name", headerName: "Full Name", flex: 1 },
        { field: "kap_email", headerName: "KAP Email", flex: 1,  renderCell: (params) => (params.value ? params.value : "N/A"), },
        { field: "university", headerName: "University", flex: 1,  renderCell: (params) => (params.value ? params.value : "N/A"), },
        { field: "program", headerName: "Program", flex: 1,  renderCell: (params) => (params.value ? params.value : "N/A"), },
        {
            field: "status",
            headerName: "Status",
            flex: 1,
            renderCell: (params) => {
                const status = params.row.status;
                return (
                    <Chip
                        label={getStatusText(status)}
                        color={
                            status === 1 ? "primary" :
                            status === 2 ? "warning" :
                            status === 3 ? "secondary" :
                            status === 4 ? "success" : "default"
                        }
                        size="small"
                    />
                );
            }
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => {
                const action = params.row.status === 1 ? "View" : 
                             params.row.assigned_to === userId ? "Download" : "view";
                return (
                    <Box>
                        <IconButton
                            component={Link}
                            to={`/school-admission/new-school-applications/assigned-applications/${params.row.full_name}?id=${params.row.id}&sop=${params.row.sop}&action=${action}&prop_id=${params.row.prop_id}`}
                        >
                            <VisibilityIcon color="primary" />
                        </IconButton>
                    </Box>
                );
            },
        },
    ];

    return (
        <div className="px-3">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-12">
                        <div className="card">
                            <div className="card-body">
                                <div className="card">
                                    <div className="card-header">
                                        <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                                            <p className="font-bold text-[24px] text-white py-4 text-center">
                                                Assigned Applications
                                            </p>
                                        </div>
                                    </div>

                                    <div className="card-body mb-4">
                                        <div className="flex flex-row gap-4 mb-4">
                                            <TextField
                                                label="Search..."
                                                variant="outlined"
                                                fullWidth
                                                value={searchQuery}
                                                onChange={handleSearch}
                                                sx={{ flex: 1 }}
                                            />
                                            <Button
                                                variant="contained"
                                                sx={{ textTransform: 'none' }}
                                                color="primary"
                                                size="small"
                                                onClick={handleExportExcel}
                                            >
                                                Export to Excel
                                            </Button>
                                        </div>

                                        <div style={{ height: 400, width: '100%' }}>
                                            <DataGrid
                                                rows={filteredApplications}
                                                columns={columns}
                                                initialState={{
                                                    pagination: {
                                                        paginationModel: { pageSize: 10 },
                                                    },
                                                }}
                                                pageSizeOptions={[5, 10, 25]}
                                                getRowId={(row) => row.id}
                                                disableRowSelectionOnClick
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignedApplications;