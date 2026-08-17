'use client';

import type { ICalendarView, ICalendarEvent } from 'src/types/calendar';

import Calendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import thLocale from '@fullcalendar/core/locales/th';
import interactionPlugin from '@fullcalendar/interaction';
import enGbLocale from '@fullcalendar/core/locales/en-gb';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useTranslate } from 'src/locales';
import { DashboardContent } from 'src/layouts/dashboard';

import { RemixIcon } from 'src/components/remix-icon';

import { CalendarRoot } from '../styles';
import { useCalendar } from '../hooks/use-calendar';

// ----------------------------------------------------------------------

type CalendarViewProps = {
  events?: ICalendarEvent[];
  loading?: boolean;
  pageTitle?: string;
  embedded?: boolean;
  editable?: boolean;
  showCreateButton?: boolean;
  onCreate?: () => void;
  onEventClick?: (eventId: string) => void;
};

const VIEW_OPTIONS: Array<{
  value: ICalendarView;
  label: { th: string; en: string };
  icon: string;
}> = [
  {
    value: 'dayGridMonth',
    label: { th: 'เดือน', en: 'Month' },
    icon: 'solar:calendar-minimalistic-bold',
  },
  {
    value: 'timeGridWeek',
    label: { th: 'สัปดาห์', en: 'Week' },
    icon: 'solar:calendar-bold',
  },
  { value: 'timeGridDay', label: { th: 'วัน', en: 'Day' }, icon: 'solar:calendar-date-bold' },
  { value: 'listWeek', label: { th: 'รายการ', en: 'Agenda' }, icon: 'solar:list-bold' },
];

export function CalendarView({
  events = [],
  loading = false,
  pageTitle,
  embedded = false,
  editable = false,
  showCreateButton = false,
  onCreate,
  onEventClick,
}: CalendarViewProps = {}) {
  const { currentLang } = useTranslate();
  const language = currentLang.value === 'en' ? 'en' : 'th';
  const calendarLocale = language === 'en' ? enGbLocale : thLocale;
  const { calendarRef, view, title, onChangeView, onDateNavigation, onDatesSet } = useCalendar();

  const content = (
    <Box sx={{ minHeight: 0, display: 'flex', flex: '1 1 auto', flexDirection: 'column' }}>
      {!embedded && (
        <Box
          sx={{
            mb: { xs: 3, md: 5 },
            gap: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">
            {pageTitle ?? (language === 'en' ? 'Calendar' : 'ปฏิทิน')}
          </Typography>
          {showCreateButton && (
            <Button
              variant="contained"
              startIcon={<RemixIcon icon="mingcute:add-line" />}
              onClick={onCreate}
            >
              {language === 'en' ? 'Add item' : 'เพิ่มรายการ'}
            </Button>
          )}
        </Box>
      )}

      <Card
        sx={{
          minHeight: '60vh',
          position: 'relative',
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            p: 2.5,
            gap: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={language === 'en' ? 'Previous' : 'ก่อนหน้า'}>
              <Button color="inherit" onClick={() => onDateNavigation('prev')}>
                <RemixIcon icon="eva:arrow-ios-back-fill" />
              </Button>
            </Tooltip>
            <Button color="inherit" onClick={() => onDateNavigation('today')}>
              {language === 'en' ? 'Today' : 'วันนี้'}
            </Button>
            <Tooltip title={language === 'en' ? 'Next' : 'ถัดไป'}>
              <Button color="inherit" onClick={() => onDateNavigation('next')}>
                <RemixIcon icon="eva:arrow-ios-forward-fill" />
              </Button>
            </Tooltip>
          </Box>

          <Typography variant="h6">{title}</Typography>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_, nextView: ICalendarView | null) => {
              if (nextView) onChangeView(nextView);
            }}
            aria-label={language === 'en' ? 'Calendar view' : 'รูปแบบปฏิทิน'}
          >
            {VIEW_OPTIONS.map((option) => (
              <Tooltip key={option.value} title={option.label[language]}>
                <ToggleButton value={option.value} aria-label={option.label[language]}>
                  <RemixIcon icon={option.icon} sx={{ display: { xs: 'block', sm: 'none' } }} />
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    {option.label[language]}
                  </Box>
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        </Box>

        <CalendarRoot sx={{ minHeight: 0, display: 'flex', flex: '1 1 auto' }}>
          <Calendar
            weekends
            nowIndicator
            editable={editable}
            selectable={false}
            firstDay={0}
            aspectRatio={2}
            dayMaxEvents={4}
            eventMaxStack={3}
            headerToolbar={false}
            eventDisplay="block"
            ref={calendarRef}
            initialView={view}
            locale={calendarLocale}
            events={events}
            datesSet={onDatesSet}
            eventClick={(arg) => onEventClick?.(arg.event.id)}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          />
        </CalendarRoot>

        {loading && (
          <Box
            sx={{
              inset: 0,
              zIndex: 2,
              position: 'absolute',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.paper',
              opacity: 0.7,
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Card>
    </Box>
  );

  return embedded ? content : <DashboardContent maxWidth="xl">{content}</DashboardContent>;
}
