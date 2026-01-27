// src/pages/SurveyBuilder.tsx
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
 import { getSurvey, addQuestion, updateSurvey, publishSurvey } from '../API/surveys';
; // ensure the real folder is "api" (lowercase) and ALL imports use the same casing

// --- Types ---------------------------------------------------------------

type QType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'rating'
  | 'linear_scale';

interface Question {
  id: number;
  q_type: QType;
  question_text: string;
  is_required: boolean;
  q_order: number;
}

interface SurveyResp {
  id: number;
  title: string;
  description?: string | null;
  questions?: Question[] | null;
}

interface PublishResp {
  share_url: string;
}

const TYPES: { v: QType; label: string }[] = [
  { v: 'short_text', label: 'Short text' },
  { v: 'long_text', label: 'Long text' },
  { v: 'single_choice', label: 'Single choice' },
  { v: 'multiple_choice', label: 'Multiple choice' },
  { v: 'rating', label: 'Rating' },
  { v: 'linear_scale', label: 'Linear scale' },
];

export default function SurveyBuilder() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id')); // or use react-router params

  // If you don't need to read survey later, keep setter only but name the unused var clearly
  const [_unused, setSurvey] = useState<SurveyResp | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQ, setNewQ] = useState<Omit<Question, 'id'>>({
    q_type: 'short_text',
    question_text: '',
    is_required: false,
    q_order: 0,
  });
  const [share, setShare] = useState<string>('');

  useEffect(() => {
    // Basic guard for missing/invalid id
    if (!Number.isFinite(id)) {
      setError('Missing or invalid survey id');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const s = (await getSurvey(id)) as SurveyResp;
        setSurvey(s);
        setTitle(s.title ?? '');
        setDescription(s.description ?? '');
        setQuestions(s.questions ?? []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load survey');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function saveMeta() {
    try {
      await updateSurvey(id, { title, description });
    } catch (e: any) {
      setError(e?.message || 'Failed to save survey');
    }
  }

  async function add() {
    try {
      await addQuestion(id, { ...newQ, q_order: questions.length });
      const s = (await getSurvey(id)) as SurveyResp;
      setQuestions(s.questions ?? []);
      setNewQ({ q_type: 'short_text', question_text: '', is_required: false, q_order: 0 });
    } catch (e: any) {
      setError(e?.message || 'Failed to add question');
    }
  }

  async function publish() {
    try {
      const r = (await publishSurvey(id)) as PublishResp;
      setShare(r.share_url);
    } catch (e: any) {
      setError(e?.message || 'Failed to publish survey');
    }
  }

  if (loading) return <Typography p={3}>Loading…</Typography>;
  if (error) return (
    <Typography p={3} color="error">
      {error}
    </Typography>
  );

  return (
    <Box p={3}>
      <Typography variant="h5">Edit Survey</Typography>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            fullWidth
            sx={{ mt: 2 }}
            multiline
            minRows={2}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button sx={{ mt: 2 }} variant="contained" onClick={saveMeta}>
            Save
          </Button>
        </Grid>
      </Grid>

      <Typography mt={4} variant="h6">
        Questions
      </Typography>

      {questions.map((q) => (
        <Card key={q.id} sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1">{q.question_text}</Typography>
            <Typography variant="body2" color="text.secondary">
              Type: {q.q_type}
            </Typography>
          </CardContent>
        </Card>
      ))}

      {/* Quick add new question UI */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Add New Question
          </Typography>

          <TextField
            fullWidth
            label="Question text"
            value={newQ.question_text}
            onChange={(e) =>
              setNewQ((prev) => ({ ...prev, question_text: e.target.value }))
            }
          />

          <FormControl sx={{ mt: 2 }} fullWidth>
            <InputLabel id="type-label">Type</InputLabel>
            <Select
              labelId="type-label"
              label="Type"
              value={newQ.q_type}
              onChange={(e) =>
                setNewQ((prev) => ({ ...prev, q_type: e.target.value as QType }))
              }
            >
              {TYPES.map((t) => (
                <MenuItem key={t.v} value={t.v}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button sx={{ mt: 2 }} variant="contained" onClick={add}>
            Add Question
          </Button>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="outlined" onClick={publish}>
          Publish
        </Button>
        {share && (
          <Typography variant="body2">Share URL: {share}</Typography>
        )}
      </Box>
    </Box>
  );
}
