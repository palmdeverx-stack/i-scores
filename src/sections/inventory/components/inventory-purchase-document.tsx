import type { PropsWithChildren } from 'react';
import type { TextProps } from '@react-pdf/renderer';
import type { InventoryPurchaseDetail } from '../types';

import { Children } from 'react';
import { Page, Font, View, Document, StyleSheet, Text as PdfText } from '@react-pdf/renderer';

import {
  purchaseStatusLabels,
  purchaseDocumentDate,
  purchaseDocumentNumber,
} from '../inventory-purchase-status';

function Text({ children, ...props }: PropsWithChildren<TextProps>) {
  // Normalize SARA AM before shaping so the final glyph of Thai text is preserved.
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
Font.register({
  family: 'InventoryThai',
  fonts: [
    { src: '/fonts/LINESeedSansTH-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/LINESeedSansTH-Bold.ttf', fontWeight: 700 },
  ],
});
const styles = StyleSheet.create({
  page: {
    fontFamily: 'InventoryThai',
    fontSize: 10,
    color: '#1C252E',
    backgroundColor: '#FFFFFF',
    padding: 40,
    paddingBottom: 55,
    lineHeight: 1.6,
  },
  title: { fontSize: 17, fontWeight: 700, textAlign: 'center', marginBottom: 5 },
  school: { fontSize: 12, textAlign: 'center', marginBottom: 24 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontWeight: 700 },
  section: { marginTop: 16, marginBottom: 6, fontWeight: 700 },
  header: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F5',
    borderBottom: '1 solid #B9C4CF',
    paddingVertical: 7,
  },
  row: { flexDirection: 'row', borderBottom: '0.5 solid #DCE4EA', paddingVertical: 7 },
  cell: { paddingHorizontal: 4 },
  note: { marginTop: 16, padding: 10, backgroundColor: '#F7F9FA' },
  footer: {
    position: 'absolute',
    bottom: 20,
    height: 16,
    lineHeight: 1,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#637381',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
export function InventoryPurchaseDocument({ detail }: { detail: InventoryPurchaseDetail }) {
  const { purchase, items, remaining } = detail;
  const number = purchaseDocumentNumber(purchase.purchase_number);
  const posted = ['ordered', 'partially_received', 'received'].includes(purchase.status);
  return (
    <Document title={`${number} ${purchase.title}`} author={detail.schoolName} language="th">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ใบขออนุมัติจัดซื้อพัสดุ</Text>
        <Text style={styles.school}>{detail.schoolName || 'โรงเรียน'}</Text>
        <View style={styles.meta}>
          <Text>เลขที่ {number}</Text>
          <Text>วันที่ {purchaseDocumentDate(purchase.created_at)}</Text>
        </View>
        <Text>
          <Text style={styles.label}>สถานะ: </Text>
          {purchaseStatusLabels[purchase.status]}
        </Text>
        <Text>
          <Text style={styles.label}>เรื่อง: </Text>
          {purchase.title}
        </Text>
        <Text>
          <Text style={styles.label}>ผู้ขอจัดซื้อ: </Text>
          {detail.requestedBy}
        </Text>
        <Text style={styles.section}>เหตุผลและความจำเป็น</Text>
        <Text>{purchase.purpose}</Text>
        <Text style={styles.section}>รายการพัสดุที่ขอจัดซื้อ ({purchase.lines.length} รายการ)</Text>
        <View style={styles.header}>
          {[
            ['ลำดับ', '7%'],
            ['รหัสพัสดุ', '19%'],
            ['รายการ', '34%'],
            ['ขอซื้อ', '11%'],
            ['หน่วย', '9%'],
            ['รับแล้ว', '10%'],
            ['ค้างรับ', '10%'],
          ].map(([label, width]) => (
            <Text key={label} style={[styles.cell, { width, fontWeight: 700 }]}>
              {label}
            </Text>
          ))}
        </View>
        {purchase.lines.map((line, index) => {
          const item = items.find((entry) => entry.id === line.item_id);
          const left = posted
            ? Number(
                remaining.find((entry) => entry.item_id === line.item_id)?.quantity ?? line.quantity
              )
            : line.quantity;
          return (
            <View key={line.item_id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: '7%' }]}>{index + 1}</Text>
              <Text style={[styles.cell, { width: '19%', fontSize: 8 }]}>{item?.code || '—'}</Text>
              <Text style={[styles.cell, { width: '34%' }]}>
                {item?.name || 'ไม่พบรายการพัสดุ'}
              </Text>
              <Text style={[styles.cell, { width: '11%' }]}>{line.quantity}</Text>
              <Text style={[styles.cell, { width: '9%' }]}>{item?.unit || '—'}</Text>
              <Text style={[styles.cell, { width: '10%' }]}>
                {posted ? line.quantity - left : '—'}
              </Text>
              <Text style={[styles.cell, { width: '10%' }]}>{posted ? left : '—'}</Text>
            </View>
          );
        })}
        <View style={styles.note} wrap={false}>
          <Text style={styles.label}>ผลการพิจารณา</Text>
          <Text>
            ผู้พิจารณา: {detail.reviewedBy} · วันที่ {purchaseDocumentDate(purchase.reviewed_at)}
          </Text>
          <Text>{purchase.review_note || '—'}</Text>
        </View>
        {purchase.order_number && (
          <View style={styles.note} wrap={false}>
            <Text style={styles.label}>ข้อมูลใบสั่งซื้อ</Text>
            <Text>
              เลขที่ {purchase.order_number} · วันที่ {purchaseDocumentDate(purchase.order_date)}
            </Text>
            <Text>ผู้จำหน่าย: {purchase.supplier}</Text>
            <Text>
              ไฟล์แนบใบสั่งซื้อ: {purchase.attachment_path ? 'แนบในระบบแล้ว' : 'ยังไม่มีไฟล์แนบ'}
            </Text>
          </View>
        )}
        <View style={styles.footer} fixed>
          <PdfText style={{ fontFamily: 'InventoryThai', fontSize: 8, width: '50%' }}>
            {number}
          </PdfText>
        </View>
      </Page>
    </Document>
  );
}
