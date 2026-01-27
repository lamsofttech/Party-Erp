import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination
} from '@mui/material';
import type { AlertColor } from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  Share,
  Edit,
  Delete,
  Visibility,
  AddCircleOutline as AddIcon,
  Campaign as CampaignIcon,
  Event as EventIcon,
  AutoAwesome as AutoAwesomeIcon, // New AI icon
  Schedule as ScheduleIcon // Icon for scheduling
} from '@mui/icons-material';

// --- API Configuration ---
// IMPORTANT: Ensure your XAMPP server is running and accessible at this base URL.
// This is the common local address for XAMPP.
// If your XAMPP is on a different port (e.g., 8080) or IP, adjust accordingly.
const API_BASE_URL = 'https://skizagroundsuite.com/API/v1'; // <--- THIS IS THE KEY CHANGE

// Note on image_url: Your PHP backend currently returns image_url values
// like 'https://example.com/images/...'. For local development, if you want
// these images to load, you'll need to either:
// 1. Ensure those images are actually accessible from your network/internet.
// 2. Modify your PHP backend's image handling logic to return local paths
//    (e.g., 'https://skizagroundsuite.com/images/...') if images are stored locally in XAMPP's htdocs.
// This frontend change only affects where it *sends* API requests.

// --- Interface Definitions ---
interface SocialPost {
  id: string;
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin';
  content: string;
  imageUrl?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: string; // ISO string
  publishedAt?: string; // ISO string
  engagements: {
    likes: number;
    comments: number;
    shares: number;
  };
}

// Helper function for making authenticated fetch requests (if needed later)
// For now, it's a simple fetch, assuming no authentication required by your PHP scripts.
const simpleFetch = async (url: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  let responseBodyText = '';
  try {
    responseBodyText = await response.text(); // read the body once
  } catch (e) {
    console.warn("Failed to read response body as text. It might be empty or malformed.", e);
  }

  if (!response.ok) {
    let errorMessage = 'Something went wrong on the server.';
    try {
      const parsedError = JSON.parse(responseBodyText);
      if (parsedError && parsedError.message) {
        errorMessage = parsedError.message;
      } else if (responseBodyText) {
        errorMessage = responseBodyText;
      }
    } catch (e) {
      errorMessage = responseBodyText || `API request failed with status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204 || !responseBodyText) {
    return null;
  }

  try {
    return JSON.parse(responseBodyText);
  } catch (e) {
    console.error("Failed to parse successful response body as JSON:", e, "Raw body:", responseBodyText);
    throw new Error("Received a successful but unparseable response from the server.");
  }
};

// --- Real API Functions (Connecting to Local XAMPP PHP Scripts) ---

const fetchPosts = async (page: number, limit: number, filter: string, platform: string): Promise<{ data: SocialPost[], total: number }> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (filter) {
    params.append('filter', filter);
  }
  if (platform && platform !== 'all') {
    params.append('platform', platform);
  }
  const url = `${API_BASE_URL}/social-posts/index.php?${params.toString()}`;
  const responseData = await simpleFetch(url);

  if (!responseData || typeof responseData !== 'object' || !Array.isArray(responseData.data)) {
    console.error("Unexpected response format for fetchPosts:", responseData);
    return { data: [], total: 0 };
  }

  return {
    data: responseData.data,
    total: responseData.totalRecords || 0,
  };
};

const createPost = async (post: Omit<SocialPost, 'id' | 'engagements'>): Promise<SocialPost> => {
  const url = `${API_BASE_URL}/social-posts/create.php`;
  const postData = {
    ...post,
    scheduledAt: post.scheduledAt || null,
    publishedAt: post.publishedAt || null,
  };
  const response = await simpleFetch(url, {
    method: 'POST',
    body: JSON.stringify(postData),
  });
  if (!response || !response.data) {
    throw new Error("API did not return created post data.");
  }
  return response.data;
};

const updatePost = async (updatedPost: SocialPost): Promise<SocialPost> => {
  const url = `${API_BASE_URL}/social-posts/update.php`;
  const postData = {
    ...updatedPost,
    scheduledAt: updatedPost.scheduledAt || null,
    publishedAt: updatedPost.publishedAt || null,
  };
  const response = await simpleFetch(url, {
    method: 'PUT',
    body: JSON.stringify(postData),
  });
  if (!response || !response.data) {
    throw new Error("API did not return updated post data.");
  }
  return response.data;
};

const deletePost = async (id: string): Promise<void> => {
  const url = `${API_BASE_URL}/social-posts/delete.php`;
  await simpleFetch(url, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
};

// --- Real AI API Functions ---

const generateAiContent = async (topic: string, platform: SocialPost['platform']): Promise<string> => {
  const params = new URLSearchParams({ topic, platform });
  const url = `${API_BASE_URL}/ai/generate-content/generate-content.php?${params.toString()}`;
  const response = await simpleFetch(url);
  if (!response || typeof response.content !== 'string') {
    throw new Error("AI content generation API did not return expected content.");
  }
  return response.content;
};

const suggestAiPublishTime = async (platform: SocialPost['platform']): Promise<string> => {
  const params = new URLSearchParams({ platform });
  const url = `${API_BASE_URL}/ai/generate-content/suggest-time.php?${params.toString()}`;
  const response = await simpleFetch(url);
  if (!response || typeof response.suggestedTime !== 'string') {
    throw new Error("AI suggested time API did not return expected time.");
  }
  return response.suggestedTime;
};


// --- Component Definitions ---

interface EngagementCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

const EngagementCard: React.FC<EngagementCardProps> = ({ label, value, icon }) => {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', boxShadow: theme.shadows[3] }}>
      {icon}
      <Box sx={{ ml: 2 }}>
        <Typography variant="h6" color="primary.main">{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Paper>
  );
};

interface PlatformIconProps {
  platform: SocialPost['platform'];
  sx?: object;
}

const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, sx }) => {
  switch (platform) {
    case 'facebook': return <FacebookIcon color="primary" sx={sx} />;
    case 'twitter': return <TwitterIcon color="info" sx={sx} />;
    case 'instagram': return <InstagramIcon color="secondary" sx={sx} />;
    case 'linkedin': return <LinkedInIcon sx={{ color: '#0077B5', ...sx }} />;
    default: return null;
  }
};

const getStatusColor = (status: SocialPost['status']): AlertColor => {
  switch (status) {
    case 'published': return 'success';
    case 'scheduled': return 'warning';
    case 'draft': return 'info'; // Changed from 'default' to 'info' for a valid AlertColor
    case 'failed': return 'error';
    default: return 'info'; // Fallback to a valid AlertColor
  }
};

const SocialMediaPostsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success'); // FIX: accept 'warning' too

  const [filterText, setFilterText] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPostsCount, setTotalPostsCount] = useState(0);
  const postsPerPage = 6;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<SocialPost | null>(null);

  const [formContent, setFormContent] = useState('');
  const [formPlatform, setFormPlatform] = useState<SocialPost['platform']>('facebook');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStatus, setFormStatus] = useState<SocialPost['status']>('draft');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [aiContentTopic, setAiContentTopic] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isSuggestingTime, setIsSuggestingTime] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [currentPage, filterText, filterPlatform]);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPosts(currentPage, postsPerPage, filterText, filterPlatform);
      setPosts(response.data);
      setTotalPostsCount(response.total);
      setTotalPages(Math.ceil(response.total / postsPerPage));
    } catch (err: any) {
      console.error("Failed to fetch social posts:", err);
      setError("Failed to load social media posts: " + err.message);
      setSnackbarMessage("Failed to load posts.");
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    void event; // FIX: silence TS6133
    setCurrentPage(value);
  };

  const handleOpenCreateModal = () => {
    setCurrentPost(null);
    setFormContent('');
    setFormPlatform('facebook');
    setFormImageUrl('');
    setFormStatus('draft');
    setFormScheduledAt('');
    setAiContentTopic('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: SocialPost) => {
    setCurrentPost(post);
    setFormContent(post.content);
    setFormPlatform(post.platform);
    setFormImageUrl(post.imageUrl || '');
    setFormStatus(post.status);
    setFormScheduledAt(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '');
    setAiContentTopic('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPost(null);
  };

  const handleSubmitPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const postData: Omit<SocialPost, 'id' | 'engagements'> = {
        content: formContent,
        platform: formPlatform,
        imageUrl: formImageUrl || undefined,
        status: formStatus,
        scheduledAt: formStatus === 'scheduled' && formScheduledAt ? new Date(formScheduledAt).toISOString() : undefined,
        publishedAt: formStatus === 'published' ? new Date().toISOString() : undefined
      };

      if (!postData.content.trim()) {
        throw new Error("Post content cannot be empty.");
      }
      if (!postData.platform) {
        throw new Error("Platform must be selected.");
      }
      if (postData.status === 'scheduled' && !postData.scheduledAt) {
        throw new Error("Scheduled posts require a schedule time.");
      }

      if (currentPost) {
        await updatePost({
          ...currentPost,
          ...postData,
          id: currentPost.id,
          engagements: currentPost.engagements,
        });
        setSnackbarMessage("Post updated successfully!");
      } else {
        await createPost(postData);
        setSnackbarMessage("Post created successfully!");
      }
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseModal();
      loadPosts();
    } catch (err: any) {
      console.error("Failed to save post:", err);
      setError("Failed to save post: " + err.message);
      setSnackbarMessage("Failed to save post: " + err.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setLoading(true);
      try {
        await deletePost(id);
        setSnackbarMessage("Post deleted successfully!");
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        loadPosts();
      } catch (err: any) {
        console.error("Failed to delete post:", err);
        setError("Failed to delete post: " + err.message);
        setSnackbarMessage("Failed to delete post: " + err.message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    void event; // FIX: silence TS6133
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // --- AI Feature Handlers ---
  const handleGenerateAiContent = async () => {
    if (!aiContentTopic.trim()) {
      setSnackbarMessage("Please enter a topic for AI content generation.");
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    setIsGeneratingContent(true);
    try {
      const generated = await generateAiContent(aiContentTopic, formPlatform);
      setFormContent(generated);
      setSnackbarMessage("AI content generated!");
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error("Failed to generate AI content:", err);
      setSnackbarMessage("Failed to generate AI content: " + err.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleSuggestAiScheduleTime = async () => {
    setIsSuggestingTime(true);
    try {
      const suggestedTime = await suggestAiPublishTime(formPlatform);
      setFormScheduledAt(suggestedTime);
      setFormStatus('scheduled');
      setSnackbarMessage("AI suggested optimal schedule time!");
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error("Failed to suggest AI schedule time:", err);
      setSnackbarMessage("Failed to suggest AI schedule time: " + err.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSuggestingTime(false);
    }
  };

  // Calculate overall engagements for the summary cards from currently loaded posts
  const publishedCount = posts.filter(post => post.status === 'published').length;
  const scheduledCount = posts.filter(post => post.status === 'scheduled').length;
  const draftCount = posts.filter(post => post.status === 'draft').length;

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: isDark ? '#0c0c0c' : '#f0f2f5' }}>
      <Typography variant="h4" fontWeight={700} mb={4} color={isDark ? '#e0e0e0' : '#333'}>
        Social Media Management <AutoAwesomeIcon sx={{ verticalAlign: 'middle', ml: 1, color: theme.palette.warning.main }} />
      </Typography>

      {/* Summary Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <EngagementCard
            label="Total Posts"
            value={totalPostsCount}
            icon={<CampaignIcon color="primary" sx={{ fontSize: 40 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EngagementCard
            label="Published Posts"
            value={publishedCount}
            icon={<Visibility color="success" sx={{ fontSize: 40 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EngagementCard
            label="Scheduled Posts"
            value={scheduledCount}
            icon={<EventIcon color="warning" sx={{ fontSize: 40 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EngagementCard
            label="Draft Posts"
            value={draftCount}
            icon={<Edit color="info" sx={{ fontSize: 40 }} />}
          />
        </Grid>
      </Grid>
      
      <hr style={{ border: `1px solid ${isDark ? '#333' : '#ccc'}`, margin: '2rem 0' }} />

      {/* Post Management */}
      {/* Action Bar & Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
        >
          Create New Post
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Search Posts"
            variant="outlined"
            size="small"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
              },
              '& .MuiInputLabel-root': {
                color: isDark ? '#b0b0b0' : 'rgba(0, 0, 0, 0.6)',
              },
              '& .MuiInputBase-input': {
                color: isDark ? '#e0e0e0' : 'rgba(0, 0, 0, 0.87)',
              }
            }}
          />
          <TextField
            select
            label="Platform"
            variant="outlined"
            size="small"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            sx={{
              minWidth: 120,
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
              },
              '& .MuiInputLabel-root': {
                color: isDark ? '#b0b0b0' : 'rgba(0, 0, 0, 0.6)',
              },
              '& .MuiInputBase-input': {
                color: isDark ? '#e0e0e0' : 'rgba(0, 0, 0, 0.87)',
              }
            }}
          >
            <MenuItem value="all">All Platforms</MenuItem>
            <MenuItem value="facebook">Facebook</MenuItem>
            <MenuItem value="twitter">Twitter</MenuItem>
            <MenuItem value="instagram">Instagram</MenuItem>
            <MenuItem value="linkedin">LinkedIn</MenuItem>
          </TextField>
        </Box>
      </Box>

      {/* Loading, Error, or No Posts */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : posts.length === 0 ? (
        <Alert severity="info">No social media posts found matching your criteria.</Alert>
      ) : (
        <>
          {/* Posts Grid */}
          <Grid container spacing={3}>
            {posts.map((post) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={post.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '12px',
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
                    background: isDark ? '#1a1a1a' : '#ffffff',
                    color: isDark ? '#e0e0e0' : '#333',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip
                        label={post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        color={getStatusColor(post.status)} // Use the corrected function
                        size="small"
                      />
                      <PlatformIcon platform={post.platform} sx={{ fontSize: 24 }} />
                    </Box>
                    <Typography variant="body1" sx={{ mb: 1, maxHeight: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.content}
                    </Typography>
                    {post.imageUrl && (
                      <Box sx={{ mt: 1, mb: 1, maxHeight: 150, overflow: 'hidden', borderRadius: '8px' }}>
                        <img
                          src={post.imageUrl}
                          alt="Post visual"
                          style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                        />
                      </Box>
                    )}
                    {post.status === 'scheduled' && post.scheduledAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                      </Typography>
                    )}
                    {post.status === 'published' && post.publishedAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Published: {new Date(post.publishedAt).toLocaleString()}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                      <Chip label={`Likes: ${post.engagements.likes}`} size="small" />
                      <Chip label={`Comments: ${post.engagements.comments}`} size="small" />
                      <Chip label={`Shares: ${post.engagements.shares}`} size="small" />
                    </Box>
                  </CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, borderTop: isDark ? '1px solid #2a2a2a' : '1px solid #eee' }}>
                    <Tooltip title="View Post">
                      <IconButton size="small" onClick={() => console.log('View post', post.id)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Post">
                      <IconButton size="small" onClick={() => handleOpenEditModal(post)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Post">
                      <IconButton size="small" onClick={() => handleDeletePost(post.id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                    {post.status === 'published' && (
                      <Tooltip title="Share Post">
                        <IconButton size="small" onClick={() => console.log('Share post', post.id)}>
                          <Share />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              variant="outlined"
              shape="rounded"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: isDark ? '#e0e0e0' : 'rgba(0, 0, 0, 0.87)',
                  borderColor: isDark ? '#333' : '#ccc',
                },
                '& .MuiPaginationItem-root.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: '#fff',
                },
              }}
            />
          </Box>
        </>
      )}
      
      <hr style={{ border: `1px solid ${isDark ? '#333' : '#ccc'}`, margin: '2rem 0' }} />

      {/* Create/Edit Post Modal */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>{currentPost ? 'Edit Social Post' : 'Create New Social Post'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {!currentPost && (
              <Grid item xs={12}>
                <TextField
                  label="AI Content Topic (e.g., 'new product launch', 'community event')"
                  fullWidth
                  variant="outlined"
                  value={aiContentTopic}
                  onChange={(e) => setAiContentTopic(e.target.value)}
                  disabled={isGeneratingContent}
                  sx={{ mb: 1 }}
                />
                <Button
                  variant="outlined"
                  startIcon={isGeneratingContent ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
                  onClick={handleGenerateAiContent}
                  disabled={isGeneratingContent || !aiContentTopic.trim()}
                  sx={{ mb: 2 }}
                >
                  {isGeneratingContent ? 'Generating...' : 'Generate AI Content'}
                </Button>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Post Content"
                multiline
                rows={4}
                fullWidth
                variant="outlined"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                required
                error={!formContent.trim() && !loading}
                helperText={!formContent.trim() && !loading ? "Content is required" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Platform"
                fullWidth
                variant="outlined"
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value as SocialPost['platform'])}
                required
              >
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Image URL (Optional)"
                fullWidth
                variant="outlined"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Status"
                fullWidth
                variant="outlined"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as SocialPost['status'])}
                required
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="published">Publish Now</MenuItem>
              </TextField>
            </Grid>
            {formStatus === 'scheduled' && (
              <Grid item xs={12}>
                <TextField
                  label="Schedule Time"
                  type="datetime-local"
                  fullWidth
                  variant="outlined"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 1 }}
                  required={formStatus === 'scheduled'}
                  error={formStatus === 'scheduled' && !formScheduledAt && !loading}
                  helperText={formStatus === 'scheduled' && !formScheduledAt && !loading ? "Schedule time is required for scheduled posts" : ""}
                />
                <Button
                  variant="outlined"
                  startIcon={isSuggestingTime ? <CircularProgress size={20} /> : <ScheduleIcon />}
                  onClick={handleSuggestAiScheduleTime}
                  disabled={isSuggestingTime}
                >
                  {isSuggestingTime ? 'Suggesting...' : 'Suggest Optimal Time (AI)'}
                </Button>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPost}
            variant="contained"
            color="primary"
            disabled={
              loading ||
              !formContent.trim() ||
              (formStatus === 'scheduled' && !formScheduledAt)
            }
          >
            {loading ? <CircularProgress size={24} /> : (currentPost ? 'Update Post' : 'Create Post')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SocialMediaPostsPage;