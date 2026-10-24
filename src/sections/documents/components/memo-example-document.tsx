import type { PropsWithChildren } from 'react';
import type { TextProps } from '@react-pdf/renderer';

import { Children } from 'react';
import { Page, Font, View, Document, StyleSheet, Text as PdfText } from '@react-pdf/renderer';

Font.register({
  family: 'MemoSarabun',
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
    fontFamily: 'MemoSarabun',
    fontSize: 14,
    lineHeight: 1.5,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    paddingTop: 38,
    paddingLeft: 65,
    paddingRight: 45,
    paddingBottom: 45,
  },
  sample: { fontSize: 9, color: '#7B8794', textAlign: 'right', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 17 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { fontWeight: 700 },
  rule: { borderBottom: '0.6 solid #5B6470', paddingBottom: 7, marginBottom: 11 },
  paragraph: { textIndent: 35, marginBottom: 10 },
  signature: { marginTop: 16, marginLeft: '43%', textAlign: 'center' },
  review: { marginTop: 23, borderTop: '0.5 solid #D5DADE', paddingTop: 10 },
});

export function MemoExampleDocument({
  schoolName = 'โรงเรียนตัวอย่าง',
  documentPrefix = 'ศธ ๐๐๐๐๐',
}: { schoolName?: string; documentPrefix?: string } = {}) {
  return (
    <Document title="ตัวอย่างบันทึกข้อความ" language="th">
      <Page size="A4" style={styles.page}>
        <Text style={styles.sample}>ตัวอย่างแม่แบบ · ข้อมูลสมมติ</Text>
        <Text style={styles.title}>บันทึกข้อความ</Text>
        <Text>
          <Text style={styles.label}>ส่วนราชการ </Text>
          {schoolName} งานวิชาการ โทร. ๐ ๐๐๐๐ ๐๐๐๐
        </Text>
        <View style={styles.row}>
          <Text style={{ width: '45%' }}>
            <Text style={styles.label}>ที่ </Text>
            {documentPrefix}/........
          </Text>
          <Text>
            <Text style={styles.label}>วันที่ </Text>๒๔ ตุลาคม ๒๕๖๙
          </Text>
        </View>
        <Text style={styles.rule}>
          <Text style={styles.label}>เรื่อง </Text>ขออนุมัติจัดกิจกรรมส่งเสริมการเรียนรู้
        </Text>
        <Text style={{ marginBottom: 14 }}>เรียน ผู้อำนวยการ{schoolName}</Text>
        <Text style={styles.paragraph}>
          ด้วยงานวิชาการมีความประสงค์จะจัดกิจกรรมส่งเสริมการเรียนรู้
          เพื่อพัฒนาทักษะและประสบการณ์ของนักเรียนให้สอดคล้องกับแผนการจัดการเรียนรู้ของโรงเรียน
        </Text>
        <Text style={styles.paragraph}>
          ในการนี้ ขออนุมัติจัดกิจกรรมดังกล่าวในวันที่ ๑๕ พฤศจิกายน ๒๕๖๙ ณ
          ห้องประชุมโรงเรียนตัวอย่าง
          โดยมีครูผู้รับผิดชอบและนักเรียนเข้าร่วมตามรายละเอียดที่แนบมาพร้อมบันทึกข้อความนี้
        </Text>
        <Text style={styles.paragraph}>จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</Text>
        <View style={styles.signature} wrap={false}>
          <Text>ลงชื่อ ................................................</Text>
          <Text>(นางสาวครูตัวอย่าง ใจดี)</Text>
          <Text>ตำแหน่ง ครู</Text>
        </View>
        <View style={styles.review} wrap={false}>
          <Text style={styles.label}>ความเห็น / ข้อสั่งการ</Text>
          <Text>
            ........................................................................................................
          </Text>
          <Text>
            ........................................................................................................
          </Text>
          <View style={styles.signature}>
            <Text>ลงชื่อ ................................................</Text>
            <Text>(................................................)</Text>
            <Text>ผู้อำนวยการโรงเรียน</Text>
            <Text>วันที่ .......... / .......... / ..........</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
