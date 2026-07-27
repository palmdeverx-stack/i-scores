'use client';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { RemixIcon } from 'src/components/remix-icon';

import { SCHOOL_DOCUMENT_TEMPLATES } from '../document-catalog';

// ----------------------------------------------------------------------

export function DocumentListView({
  detailBasePath = paths.admin.documents.root,
}: {
  detailBasePath?: string;
}) {
  const [search, setSearch] = useState('');
  const documents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return SCHOOL_DOCUMENT_TEMPLATES;
    return SCHOOL_DOCUMENT_TEMPLATES.filter((item) =>
      [item.code, item.name, item.description]
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword)
    );
  }, [search]);

  return (
    <Container maxWidth={false} sx={{ pb: 6 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">เอกสาร</Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          ดูรายละเอียด รูปแบบข้อมูล และตัวอย่าง PDF ของเอกสารงานทะเบียนและผลการเรียน
        </Typography>
      </Box>

      <Card variant="outlined">
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อหรือรหัสเอกสาร"
            sx={{ width: { xs: 1, sm: 380 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <RemixIcon icon="eva:search-fill" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 950 }}>
            <TableHead>
              <TableRow>
                <TableCell>รหัสเอกสาร</TableCell>
                <TableCell>ชื่อเอกสาร</TableCell>
                <TableCell>แหล่งข้อมูล</TableCell>
                <TableCell>รูปแบบ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.slug} hover>
                  <TableCell>
                    <Chip variant="soft" color="primary" label={document.code} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 380 }}>
                    <Typography variant="subtitle2">{document.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {document.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{document.source}</TableCell>
                  <TableCell>{document.paper}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ gap: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        component={RouterLink}
                        href={`${detailBasePath}/${document.slug}`}
                        size="small"
                        variant="outlined"
                      >
                        ดูรายละเอียด
                      </Button>
                      <Button
                        component={RouterLink}
                        href={`${detailBasePath}/${document.slug}?preview=1`}
                        size="small"
                        variant="contained"
                        startIcon={<RemixIcon icon="solar:eye-bold" />}
                      >
                        ตัวอย่าง PDF
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {!documents.length && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}>
                    ไม่พบเอกสารที่ค้นหา
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
