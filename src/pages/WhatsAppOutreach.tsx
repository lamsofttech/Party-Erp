import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  useTheme,
  CircularProgress,
  Checkbox,
  ListItemText,
  Select,
  SelectChangeEvent,
  FormControl,
  InputLabel
} from '@mui/material';

interface User {
  phone_number: string;
  full_name: string;
}

const sendTypeOptions = [
  { label: 'Single Recipient', value: 'single' },
  { label: 'Group Selection', value: 'group' },
  { label: 'All Users', value: 'all' }
];

const WhatsAppOutreach: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [sendType, setSendType] = useState<'single' | 'group' | 'all'>('single');
  const [recipient, setRecipient] = useState('');
  const [groupRecipients, setGroupRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch users from API when needed
  useEffect(() => {
    if (sendType === 'single') return;

    setLoadingUsers(true);

    fetch('https://internationalscholarsdev.qhtestingserver.com/ABIS/ABIS/example/get_all_users.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((user: any) => ({
            phone_number: user.phone_number,
            full_name: user.full_name || user.phone_number
          }));
          setUsers(mapped);
        } else {
          console.error('Unexpected response:', data);
        }
      })
      .catch(err => {
        console.error('Fetch failed:', err);
      })
      .finally(() => setLoadingUsers(false));
  }, [sendType]);

  // Properly typed handler for multiple Select
  const handleGroupRecipientsChange = (event: SelectChangeEvent<string[]>) => {
    const { value } = event.target;
    // value can be a string (from autofill) or an array
    setGroupRecipients(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSend = async () => {
    let recipients: string[] = [];

    if (sendType === 'single') {
      recipients = [recipient];
    } else if (sendType === 'group') {
      recipients = groupRecipients;
    } else if (sendType === 'all') {
      recipients = users.map(user => user.phone_number);
    }

    if (!message.trim() || recipients.length === 0) {
      alert('Please enter a message and at least one recipient.');
      return;
    }

    try {
      const res = await fetch('https://internationalscholarsdev.qhtestingserver.com/ABIS/ABIS/example/send_whatsapp.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, recipients })
      });
      const result = await res.json();
      console.log('Message send result:', result);
      alert('✅ Messages sent. Check console for result.');
    } catch (err) {
      console.error('Send failed:', err);
      alert('❌ Failed to send messages.');
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', background: isDark ? '#0c0c0c' : '#f4f6f8' }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        WhatsApp Outreach
      </Typography>

      <TextField
        select
        label="Send To"
        value={sendType}
        onChange={(e) => setSendType(e.target.value as 'single' | 'group' | 'all')}
        fullWidth
        sx={{ mb: 3 }}
      >
        {sendTypeOptions.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {sendType === 'single' && (
        <TextField
          label="Recipient Phone Number"
          placeholder="+2547XXXXXXXX"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
        />
      )}

      {sendType === 'group' && (
        <>
          {loadingUsers ? (
            <CircularProgress />
          ) : users.length === 0 ? (
            <Typography color="error">⚠️ No users found. Check your API.</Typography>
          ) : (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="group-recipients-label">Select Recipients</InputLabel>
              <Select
                labelId="group-recipients-label"
                multiple
                value={groupRecipients}
                label="Select Recipients"
                onChange={handleGroupRecipientsChange}
                renderValue={(selected) =>
                  Array.isArray(selected) ? selected.join(', ') : String(selected)
                }
              >
                {users.map((user, i) => (
                  <MenuItem key={i} value={user.phone_number}>
                    <Checkbox checked={groupRecipients.includes(user.phone_number)} />
                    <ListItemText primary={`${user.full_name} (${user.phone_number})`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </>
      )}

      <TextField
        label="Message"
        multiline
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      {sendType !== 'single' && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            📋 Preview: {sendType === 'all' ? `${users.length} users` : `${groupRecipients.length} selected`} will receive:
          </Typography>

          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
            "{message}"
          </Typography>

          <Box
            sx={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid #ccc',
              borderRadius: 1,
              padding: 1,
              background: isDark ? '#1c1c1c' : '#fff'
            }}
          >
            {(sendType === 'all'
              ? users
              : users.filter(u => groupRecipients.includes(u.phone_number))
            ).map((user, index) => (
              <Typography key={index} variant="body2">
                • {user.full_name} ({user.phone_number})
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Button variant="contained" onClick={handleSend}>
        Send WhatsApp Message
      </Button>
    </Box>
  );
};

export default WhatsAppOutreach;
