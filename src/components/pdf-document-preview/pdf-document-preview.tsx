'use client';

import type { ReactElement, ComponentProps } from 'react';
import type { Document as RenderDocument } from '@react-pdf/renderer';

import { Page, pdfjs, Document } from 'react-pdf';
import { BlobProvider } from '@react-pdf/renderer';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RemixIcon } from 'src/components/remix-icon';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
function PdfPages({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pages, setPages] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <Box ref={ref} sx={{ width: 1, maxWidth: '210mm', mx: 'auto' }}>
      <Document
        file={url}
        loading={<Typography role="status">กำลังแสดงเอกสาร…</Typography>}
        error={<Alert severity="error">แสดงเอกสารไม่สำเร็จ กรุณาดาวน์โหลด PDF</Alert>}
        onLoadSuccess={({ numPages }) => setPages(numPages)}
      >
        {width > 0 &&
          Array.from({ length: pages }, (_, index) => (
            <Box
              key={index}
              aria-label={`หน้า ${index + 1} จาก ${pages}`}
              sx={{
                mb: 2.5,
                bgcolor: 'common.white',
                boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
                '& canvas': { display: 'block', maxWidth: '100%', height: 'auto !important' },
              }}
            >
              <Typography
                variant="caption"
                component="div"
                sx={{
                  p: 1,
                  color: 'text.secondary',
                  bgcolor: 'background.neutral',
                  textAlign: 'center',
                }}
              >
                หน้า {index + 1} / {pages}
              </Typography>
              <Page
                pageNumber={index + 1}
                width={width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Box>
          ))}
      </Document>
    </Box>
  );
}
export default function PdfDocumentPreview({
  document,
  fileName,
  label,
}: {
  document: ReactElement<ComponentProps<typeof RenderDocument>>;
  fileName: string;
  label: string;
}) {
  return (
    <BlobProvider document={document}>
      {({ url, loading, error }) => (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: 'background.neutral', borderRadius: 2 }}>
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              A4 · {label}
            </Typography>
            <Button
              component="a"
              href={url ?? undefined}
              download={fileName}
              variant="outlined"
              disabled={!url || loading || Boolean(error)}
              startIcon={<RemixIcon icon="solar:download-minimalistic-bold" />}
            >
              ดาวน์โหลด PDF
            </Button>
          </Box>
          {error ? (
            <Alert severity="error">สร้าง PDF ไม่สำเร็จ กรุณาโหลดหน้าใหม่</Alert>
          ) : loading || !url ? (
            <Typography role="status" sx={{ py: 8, textAlign: 'center' }}>
              กำลังสร้างเอกสาร…
            </Typography>
          ) : (
            <PdfPages key={url} url={url} />
          )}
        </Box>
      )}
    </BlobProvider>
  );
}
