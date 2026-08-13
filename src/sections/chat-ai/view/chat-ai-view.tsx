'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

type ChatAiViewProps = {
  workspaceId: string;
};

type Conversation = {
  id: number;
  title: string;
  preview: string;
  updatedAt: string;
  active?: boolean;
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

const CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    title: 'แนวคำถามสอบปลายภาค',
    preview: 'ช่วยออกแบบข้อสอบเรื่องเศษส่วน...',
    updatedAt: '10:24 น.',
    active: true,
  },
  {
    id: 2,
    title: 'สรุปแผนการสอนสัปดาห์นี้',
    preview: 'สรุปให้หน่อยว่าอาทิตย์นี้สอนอะไรบ้าง',
    updatedAt: 'เมื่อวาน',
  },
  {
    id: 3,
    title: 'ไอเดียกิจกรรมกลุ่ม',
    preview: 'อยากได้กิจกรรมกลุ่มสำหรับ ป.5',
    updatedAt: '1 ส.ค. 2569',
  },
];

const SUGGESTIONS = [
  'ช่วยสรุปบทเรียนวิทยาศาสตร์ ป.4 เรื่องระบบสุริยะ',
  'ออกแบบกิจกรรมกลุ่มสำหรับวิชาภาษาไทย',
  'แนะนำวิธีอธิบายเศษส่วนให้เข้าใจง่าย',
];

const INITIAL_MESSAGES: Message[] = [
  { id: 1, role: 'user', text: 'ช่วยออกแบบข้อสอบเรื่องเศษส่วน สำหรับ ป.5 จำนวน 5 ข้อ' },
  {
    id: 2,
    role: 'assistant',
    text: 'นี่คือหน้าตัวอย่าง — เมื่อเชื่อม AI แล้ว ระบบจะช่วยร่างคำถามและเฉลยให้ตามหัวข้อที่ระบุ',
  },
];

// ----------------------------------------------------------------------

export function ChatAiView({ workspaceId }: ChatAiViewProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');

  const handleSend = (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'user', text: content },
      {
        id: prev.length + 2,
        role: 'assistant',
        text: 'นี่คือหน้าตัวอย่าง — ระบบพร้อมนำข้อความนี้ไปตอบเมื่อเชื่อม AI',
      },
    ]);
    setDraft('');
  };

  return (
    <Box sx={{ minHeight: '100%', bgcolor: '#F6F7FB', color: '#172033' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                width: 42,
                height: 42,
                color: 'white',
                bgcolor: '#6C5CE7',
                boxShadow: '0 8px 18px rgba(108,92,231,0.25)',
              }}
            >
              <RemixIcon icon="solar:chat-round-dots-bold-duotone" width={25} />
            </Avatar>
            <Box>
              <Typography component="h1" variant="h5" sx={{ lineHeight: 1.15, fontWeight: 800 }}>
                Chat AI
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                ผู้ช่วยแชท AI สำหรับคุณครู
              </Typography>
            </Box>
          </Stack>

          <Chip size="small" label="ข้อมูลตัวอย่าง" color="warning" variant="outlined" />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', lg: '300px minmax(0, 1fr)' },
          }}
        >
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #EAECF2' }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<RemixIcon icon="solar:add-circle-bold-duotone" />}
              sx={{
                mb: 2,
                bgcolor: '#172033',
                '&:hover': { bgcolor: '#27324A' },
              }}
              onClick={() => setMessages([])}
            >
              แชทใหม่
            </Button>

            <Typography variant="caption" sx={{ color: 'text.secondary', pl: 0.5 }}>
              บทสนทนาล่าสุด
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {CONVERSATIONS.map((conversation) => (
                <Box
                  key={conversation.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: conversation.active ? '#F0EDFF' : 'transparent',
                    '&:hover': { bgcolor: conversation.active ? '#F0EDFF' : '#F8F8FC' },
                  }}
                >
                  <Typography noWrap variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {conversation.title}
                  </Typography>
                  <Typography noWrap variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {conversation.preview}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9AA2B1' }}>
                    {conversation.updatedAt}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 'auto', lg: 640 },
              borderRadius: 3,
              border: '1px solid #EAECF2',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <Stack spacing={1.5} sx={{ maxWidth: 480, mx: 'auto', mt: 4, textAlign: 'center' }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 48,
                      height: 48,
                      mx: 'auto',
                      color: '#6C5CE7',
                      bgcolor: '#F0EDFF',
                    }}
                  >
                    <RemixIcon icon="solar:magic-stick-3-bold-duotone" width={25} />
                  </Avatar>
                  <Typography sx={{ fontWeight: 700 }}>วันนี้ให้ช่วยอะไรดี?</Typography>
                  <Stack spacing={1}>
                    {SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion}
                        color="inherit"
                        onClick={() => handleSend(suggestion)}
                        sx={{
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          border: '1px solid #EAECF2',
                          borderRadius: 2.5,
                          px: 2,
                          py: 1.25,
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  {messages.map((message) => (
                    <Stack
                      key={message.id}
                      direction="row"
                      spacing={1.5}
                      sx={{
                        flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 34,
                          height: 34,
                          color: message.role === 'user' ? '#172033' : '#6C5CE7',
                          bgcolor: message.role === 'user' ? '#EAECF2' : '#F0EDFF',
                        }}
                      >
                        <RemixIcon
                          icon={
                            message.role === 'user'
                              ? 'solar:user-bold-duotone'
                              : 'solar:magic-stick-3-bold-duotone'
                          }
                          width={18}
                        />
                      </Avatar>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          maxWidth: 480,
                          borderRadius: 2.5,
                          color: message.role === 'user' ? 'white' : '#172033',
                          bgcolor: message.role === 'user' ? '#6C5CE7' : '#F6F7FB',
                        }}
                      >
                        <Typography variant="body2">{message.text}</Typography>
                      </Paper>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={4}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="พิมพ์คำถามหรือสิ่งที่ต้องการให้ช่วย..."
                slotProps={{
                  input: {
                    sx: { '& fieldset': { border: 0 }, bgcolor: '#F6F7FB', borderRadius: 2 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <RemixIcon icon="solar:chat-round-dots-linear" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={() => handleSend()}
                startIcon={<RemixIcon icon="custom:send-fill" />}
                sx={{
                  px: 2.5,
                  py: 1.25,
                  whiteSpace: 'nowrap',
                  bgcolor: '#172033',
                  '&:hover': { bgcolor: '#27324A' },
                }}
              >
                ส่ง
              </Button>
            </Box>
          </Paper>
        </Box>

        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 2, color: 'text.secondary', fontFamily: 'monospace' }}
        >
          Workspace ID: {workspaceId}
        </Typography>
      </Container>
    </Box>
  );
}
