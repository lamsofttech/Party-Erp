// src/components/Events/EventCalendar.tsx
import React, { useMemo, useState } from 'react';
import { Box, Typography, Badge, Tooltip, Button } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers/PickersDay';

import type { Event as AppEvent } from '../../types/campaign';
import { mockEvents } from '../../data/mockData';

/** Build an ISO datetime string from possible mock `date` and `time` fields */
const toISO = (date?: string, time?: string) => {
  if (!date) return '';
  // default to noon if time is missing/invalid
  const t = time && /^\d{1,2}:\d{2}/.test(time) ? time : '12:00';
  const d = dayjs(`${date}T${t}`);
  return d.isValid() ? d.toISOString() : '';
};

/** Normalize mock events to the app's Event shape */
const normalizedEvents: AppEvent[] = (mockEvents as any[]).map((e) => ({
  ...(e as any),
  eventId: Number((e as any).eventId ?? (e as any).id ?? 0),
  startTime: (e as any).startTime ?? toISO((e as any).date, (e as any).time),
  endTime: (e as any).endTime ?? '',
}));

const keyFromISO = (iso?: string) => {
  const d = iso ? dayjs(iso) : null;
  return d && d.isValid() ? d.format('YYYY-MM-DD') : '';
};

const timeFromISO = (iso?: string) => {
  const d = iso ? dayjs(iso) : null;
  return d && d.isValid() ? d.format('HH:mm') : '—';
};

/** Custom day (v6): supply via `slots.day` */
type DayProps = PickersDayProps<Dayjs> & {
  highlightedMap?: Record<string, AppEvent[]>;
  onEventClick?: (event: AppEvent) => void;
};

function ServerDay(props: DayProps) {
  const { highlightedMap, onEventClick, day, outsideCurrentMonth, ...other } = props;
  const key = day.format('YYYY-MM-DD');
  const list = highlightedMap?.[key] ?? [];
  const count = list.length;

  const title =
    count > 0 ? list.map((e) => `${e.name} (${timeFromISO(e.startTime)})`).join('\n') : '';

  return (
    <Tooltip
      title={<span style={{ whiteSpace: 'pre-line' }}>{title}</span>}
      placement="top"
      disableHoverListener={!count}
    >
      <span>
        <Badge overlap="circular" badgeContent={count || undefined} color="secondary">
          <PickersDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            sx={count ? { border: '2px solid', borderColor: 'primary.main' } : undefined}
            onClick={(ev) => {
              other.onClick?.(ev as any);
              if (count && onEventClick) onEventClick(list[0]);
            }}
          />
        </Badge>
      </span>
    </Tooltip>
  );
}

const EventCalendar: React.FC<{ onEventClick: (event: AppEvent) => void }> = ({ onEventClick }) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());

  // Map YYYY-MM-DD -> events[]
  const highlightedMap = useMemo(() => {
    const map: Record<string, AppEvent[]> = {};
    for (const e of normalizedEvents) {
      const k = keyFromISO(e.startTime);
      if (!k) continue;
      (map[k] ||= []).push(e);
    }
    return map;
  }, []);

  const selectedKey = selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
  const eventsForDay = highlightedMap[selectedKey] ?? [];

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Event Calendar
      </Typography>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateCalendar
          value={selectedDate}
          onChange={(newValue) => setSelectedDate(newValue)}
          slots={{ day: ServerDay }}
          slotProps={{ day: { highlightedMap, onEventClick } as any }}
          sx={{ width: '100%', maxWidth: 700, margin: '0 auto' }}
        />
      </LocalizationProvider>

      {selectedDate && (
        <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h6">
            Events on {selectedDate.format('MMMM DD, YYYY')}
          </Typography>

          {eventsForDay.length === 0 ? (
            <Typography color="text.secondary">No events for this day.</Typography>
          ) : (
            eventsForDay.map((event) => (
              <Button
                key={event.eventId}
                variant="text"
                onClick={() => onEventClick(event)}
                sx={{
                  display: 'block',
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  py: 1,
                }}
              >
                <Typography variant="body1" fontWeight="medium">
                  {event.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {timeFromISO(event.startTime)} - {event.location || '—'}
                </Typography>
              </Button>
            ))
          )}
        </Box>
      )}
    </Box>
  );
};

export default EventCalendar;
