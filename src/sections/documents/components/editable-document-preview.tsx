'use client';

import type { DocumentContent } from '../document-content';
import type { SchoolDocumentTemplate } from '../document-catalog';

import { useMemo } from 'react';

import PdfDocumentPreview from 'src/components/pdf-document-preview/pdf-document-preview';

import { EditableDocumentPdf } from './editable-document-pdf';

export default function EditableDocumentPreview({
  content,
  template,
  title,
}: {
  content: DocumentContent;
  template: SchoolDocumentTemplate;
  title: string;
}) {
  const document = useMemo(
    () => <EditableDocumentPdf content={content} template={template} title={title} />,
    [content, template, title]
  );
  return (
    <PdfDocumentPreview
      document={document}
      fileName={`${title.replace(/[\\/:*?"<>|]/g, '-')}.pdf`}
      label={template.name}
    />
  );
}
