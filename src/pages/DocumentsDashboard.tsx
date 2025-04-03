import {
    Grid,
    Card,
    CardContent,
    Typography,
    Avatar,
    Divider,
    Button,
    LinearProgress,
    useTheme,
} from '@mui/material';
import {
    DescriptionOutlined,
    TaskAltOutlined,
    SchoolOutlined,
    ArrowBack,
    InsertDriveFileOutlined,
    CancelOutlined
} from '@mui/icons-material';
import { styled } from '@mui/system';
import { Link } from 'react-router-dom';

// Mock data - replace with actual API calls
const documentStats = {
    studentDocuments: 24,
    approvedDocuments: 18,
    rejectedDocuments: 9,
    transcripts: 15,
    recentUploads: [
        { name: 'John_Doe_Transcript.pdf', date: '2023-06-15', status: 'approved' },
        { name: 'Jane_Smith_Passport.pdf', date: '2023-06-14', status: 'pending' },
        { name: 'Robert_Johnson_Recommendation.pdf', date: '2023-06-13', status: 'rejected' },
    ]
};

const StatusIndicator = styled('span')<{ status: string }>(({ theme, status }) => ({
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: 8,
    backgroundColor:
        status === 'approved' ? theme.palette.success.main :
            status === 'pending' ? theme.palette.warning.main :
                theme.palette.error.main
}));

const DocumentDashboard = () => {
    const theme = useTheme();

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-700 min-h-screen mb-6 rounded-md">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div className="flex items-center mb-4 md:mb-0">
                    <Typography variant="h4" className="font-bold" style={{ fontFamily: "'Century Gothic', sans-serif", color: "#2461A6" }}>
                        Documents Dashboard
                    </Typography>
                </div>
            </div>

            {/* Stats Cards */}
            <Grid container spacing={3} className="mb-6">
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} className="h-full hover:shadow-lg transition-shadow">
                        <CardContent className="flex items-center">
                            <Avatar
                                sx={{
                                    bgcolor: theme.palette.primary.light,
                                    width: 46,
                                    height: 46,
                                    mr: 3
                                }}
                            >
                                <DescriptionOutlined fontSize="large" />
                            </Avatar>
                            <div>
                                <Typography color="textSecondary">
                                    Student Documents
                                </Typography>
                                <Typography variant="h5" className="font-bold">
                                    {documentStats.studentDocuments}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    <span className="text-green-500">+3 new</span> today
                                </Typography>
                            </div>
                        </CardContent>
                        <Divider />
                        <div className="p-3">
                            <Link to="/school-admission/application-documents/student-documents">
                                <Button
                                    fullWidth
                                    endIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    View All
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} className="h-full hover:shadow-lg transition-shadow">
                        <CardContent className="flex items-center">
                            <Avatar
                                sx={{
                                    bgcolor: theme.palette.success.light,
                                    width: 46,
                                    height: 46,
                                    mr: 3,
                                    color: theme.palette.success.dark
                                }}
                            >
                                <TaskAltOutlined fontSize="large" />
                            </Avatar>
                            <div>
                                <Typography color="textSecondary">
                                    Approved Documents
                                </Typography>
                                <Typography variant="h5" className="font-bold">
                                    {documentStats.approvedDocuments}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    <span className="text-green-500">92%</span> approval rate
                                </Typography>
                            </div>
                        </CardContent>
                        <Divider />
                        <div className="p-3">
                            <Link to='/school-admission/application-documents/approved-documents'>
                                <Button
                                    fullWidth
                                    endIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    View All
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} className="h-full hover:shadow-lg transition-shadow">
                        <CardContent className="flex items-center">
                            <Avatar
                                sx={{
                                    bgcolor: theme.palette.error.light,
                                    width: 46,
                                    height: 46,
                                    mr: 3,
                                    color: theme.palette.error.dark
                                }}
                            >
                                <CancelOutlined fontSize="large" />
                            </Avatar>
                            <div>
                                <Typography color="textSecondary">
                                    Rejected Documents
                                </Typography>
                                <Typography variant="h5" className="font-bold">
                                    {documentStats.rejectedDocuments}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    <span className="text-red-500">+1 new</span> today
                                </Typography>
                            </div>
                        </CardContent>
                        <Divider />
                        <div className="p-3">
                            <Link to="/school-admission/application-documents/rejected-documents">
                                <Button
                                    fullWidth
                                    endIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    View All
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={3} className="h-full hover:shadow-lg transition-shadow">
                        <CardContent className="flex items-center">
                            <Avatar
                                sx={{
                                    bgcolor: theme.palette.info.light,
                                    width: 46,
                                    height: 46,
                                    mr: 3,
                                    color: theme.palette.info.dark
                                }}
                            >
                                <SchoolOutlined fontSize="large" />
                            </Avatar>
                            <div>
                                <Typography color="textSecondary">
                                    Transcripts
                                </Typography>
                                <Typography variant="h5" className="font-bold">
                                    {documentStats.transcripts}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    <span className="text-green-500">+2 new</span> today
                                </Typography>
                            </div>
                        </CardContent>
                        <Divider />
                        <div className="p-3">
                            <Link to="/school-admission/application-documents/transcripts">
                                <Button
                                    fullWidth
                                    endIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    View All
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content */}
            <Grid container spacing={3}>
                {/* Recent Uploads */}
                <Grid item xs={12} md={8}>
                    <Card elevation={3} className="h-full">
                        <CardContent>
                            <div className="flex justify-between items-center mb-4">
                                <Typography variant="h6" className="font-bold">
                                    Recent Document Uploads
                                </Typography>
                                <Button size="small" sx={{ textTransform: 'none' }}>View All</Button>
                            </div>

                            <div className="space-y-3">
                                {documentStats.recentUploads.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                                        <div className="flex items-center">
                                            <StatusIndicator status={file.status} />
                                            <InsertDriveFileOutlined className="text-gray-400 mr-2" />
                                            <div>
                                                <Typography variant="body2">{file.name}</Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {new Date(file.date).toLocaleDateString()}
                                                </Typography>
                                            </div>
                                        </div>
                                        <Button
                                            size="small"
                                            sx={{ textTransform: 'none' }}
                                            color={
                                                file.status === 'approved' ? 'success' :
                                                    file.status === 'pending' ? 'warning' : 'error'
                                            }
                                        >
                                            {file.status}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quick Actions & Stats */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3} className="h-full">
                        <CardContent>
                            <Typography variant="h6" className="font-bold" sx={{ mb: 4 }}>
                                Document Processing
                            </Typography>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Typography variant="caption">Approval Rate</Typography>
                                        <Typography variant="caption">92%</Typography>
                                    </div>
                                    <LinearProgress variant="determinate" value={92} color="success" />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Typography variant="caption">Processing Time</Typography>
                                        <Typography variant="caption">1.2 days avg.</Typography>
                                    </div>
                                    <LinearProgress variant="determinate" value={75} color="info" />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <Typography variant="caption">Rejection Rate</Typography>
                                        <Typography variant="caption">8%</Typography>
                                    </div>
                                    <LinearProgress variant="determinate" value={8} color="error" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Recent Activity (Optional - can be added if needed) */}
            {/* <div className="mt-6">
        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" className="font-bold mb-4">
              Recent Activity
            </Typography>
            Activity timeline would go here
          </CardContent>
        </Card>
      </div> */}
        </div>
    );
};

export default DocumentDashboard;