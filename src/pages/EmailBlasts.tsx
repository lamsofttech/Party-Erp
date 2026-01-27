import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import HistoryIcon from '@mui/icons-material/History';

import EmailComposer from '../components/EmailComposer';
import EmailTemplateList from '../components/EmailTemplateList';
import EmailLogTable from '../components/EmailLogTable';

const EmailBlasts = () => {
  const [tab, setTab] = useState(0);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>
        Email Blasts
      </Typography>

      <Tabs
        value={tab}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 2 }}
      >
        <Tab icon={<EmailIcon />} iconPosition="start" label="Compose" />
        <Tab icon={<LibraryBooksIcon />} iconPosition="start" label="Templates" />
        <Tab icon={<HistoryIcon />} iconPosition="start" label="Sent History" />
      </Tabs>

      <Divider sx={{ mb: 3 }} />

      {tab === 0 && <EmailComposer />}
      {tab === 1 && <EmailTemplateList />}
      {tab === 2 && <EmailLogTable />}
    </Box>
  );
};

export default EmailBlasts;
