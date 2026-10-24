import type { PropsWithChildren } from 'react';
import type { TextProps } from '@react-pdf/renderer';
import type { DocumentContent } from '../document-content';
import type { SchoolDocumentTemplate } from '../document-catalog';

import { Children } from 'react';
import { Page, Font, View, Document, StyleSheet, Text as PdfText } from '@react-pdf/renderer';

Font.register({
  family: 'EditableDocumentThai',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 700 },
  ],
});
function Text({ children, ...props }: PropsWithChildren<TextProps>) {
  return (
    <PdfText
      {...props}
      hyphenationCallback={(word) =>
        Array.from(
          new Intl.Segmenter('th', { granularity: 'word' }).segment(word),
          (part) => part.segment
        )
      }
    >
      {Children.map(children, (child) =>
        typeof child === 'string' ? child.replace(/ำ/g, 'ํา') : child
      )}
    </PdfText>
  );
}
const styles = StyleSheet.create({
  page: {
    fontFamily: 'EditableDocumentThai',
    fontSize: 14,
    lineHeight: 1.5,
    backgroundColor: '#FFFFFF',
    color: '#111111',
    paddingTop: 40,
    paddingLeft: 60,
    paddingRight: 45,
    paddingBottom: 45,
  },
  title: { fontSize: 25, fontWeight: 700, textAlign: 'center', marginBottom: 20 },
  label: { fontWeight: 700 },
  paragraph: { textIndent: 35, marginBottom: 10 },
  signature: { marginLeft: '40%', marginTop: 20, textAlign: 'center' },
  section: { marginTop: 15, marginBottom: 6, fontWeight: 700 },
});
export function EditableDocumentPdf({
  content,
  template,
  title,
}: {
  content: DocumentContent;
  template: SchoolDocumentTemplate;
  title: string;
}) {
  const memo = template.slug === 'memo';
  const date = content.documentDate
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(
        new Date(content.documentDate)
      )
    : '................................';
  return (
    <Document title={title} author={content.schoolName} language="th">
      <Page
        size="A4"
        orientation={template.paper === 'A4 แนวนอน' ? 'landscape' : 'portrait'}
        style={styles.page}
      >
        <Text style={styles.title}>{template.name}</Text>
        {memo ? (
          <>
            <Text>
              <Text style={styles.label}>ส่วนราชการ </Text>
              {content.department}
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <Text style={{ width: '50%' }}>
                <Text style={styles.label}>ที่ </Text>
                {content.documentNumber}
              </Text>
              <Text>
                <Text style={styles.label}>วันที่ </Text>
                {date}
              </Text>
            </View>
            <Text style={{ borderBottom: '0.5 solid #B8BEC5', paddingBottom: 8, marginBottom: 12 }}>
              <Text style={styles.label}>เรื่อง </Text>
              {content.subject}
            </Text>
            <Text style={{ marginBottom: 14 }}>เรียน {content.recipient}</Text>
          </>
        ) : (
          <>
            <Text style={{ textAlign: 'center', marginBottom: 18 }}>{content.schoolName}</Text>
            <Text>
              เลขที่ {content.documentNumber || '................................'} · วันที่ {date}
            </Text>
            <Text style={styles.section}>{content.subject}</Text>
            {content.recipient && <Text>เรียน {content.recipient}</Text>}
          </>
        )}
        {content.body
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        {!memo &&
          content.sections.map((section, index) => (
            <View key={index}>
              <Text style={styles.section}>
                {index + 1}. {section.title}
              </Text>
              <Text>{section.text}</Text>
            </View>
          ))}
        <View style={styles.signature} wrap={false}>
          <Text>ลงชื่อ ................................................</Text>
          <Text>({content.authorName || '................................................'})</Text>
          <Text>{content.authorPosition}</Text>
        </View>
        {memo && (
          <View style={{ marginTop: 24, borderTop: '0.5 solid #D5DADE', paddingTop: 10 }}>
            <Text style={styles.label}>ความเห็น / ข้อสั่งการ</Text>
            <Text>
              {content.reviewText ||
                '........................................................................................................\n........................................................................................................'}
            </Text>
            <View style={styles.signature} wrap={false}>
              <Text>ลงชื่อ ................................................</Text>
              <Text>
                ({content.approverName || '................................................'})
              </Text>
              <Text>{content.approverPosition}</Text>
              <Text>วันที่ .......... / .......... / ..........</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
