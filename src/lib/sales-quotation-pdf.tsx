import 'server-only';

import type { ReactNode } from 'react';
import type { TextProps } from '@react-pdf/renderer';
import type { DefaultTreeAdapterTypes } from 'parse5';
import type { SalesDocumentContent } from 'src/sections/sales-documents/sales-document-schema';

import sharp from 'sharp';
import path from 'node:path';
import { parseFragment, defaultTreeAdapter as tree } from 'parse5';
import {
  Font,
  Page,
  Text,
  View,
  Image,
  Document,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

import { salesDocumentTotals } from 'src/sections/sales-documents/sales-document-schema';
import { salesSignatureSchema } from 'src/sections/sales-documents/sales-signature-schema';
import { salesDocumentBahtText } from 'src/sections/sales-documents/sales-document-baht-text';
import { sanitizeSalesDocumentText } from 'src/sections/sales-documents/sales-document-rich-text';

const fontFamily = 'Sales Quotation LINE Seed';
Font.register({
  family: fontFamily,
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/LINESeedSansTH-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/LINESeedSansTH-Bold.ttf'), fontWeight: 700 },
  ],
});

const words = new Intl.Segmenter('th', { granularity: 'word' });
const segmentWord = (value: string) => Array.from(words.segment(value), (part) => part.segment);
const shapeThai = (value: string) => value.replaceAll('ำ', 'ํา');
const amount = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dates = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' });
const day = (value: string) => dates.format(new Date(value));
const money = (satang: number) => amount.format(satang / 100);

const styles = StyleSheet.create({
  page: { fontFamily, fontSize: 11.25, lineHeight: 1.45, color: '#182230', padding: 39.7 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 21, lineHeight: 1.25, marginBottom: 4, fontWeight: 700, color: '#14243a' },
  number: { fontSize: 15, lineHeight: 1.25, fontWeight: 700, color: '#14243a', marginVertical: 3 },
  logo: { width: 54, height: 48, objectFit: 'contain', marginRight: 12 },
  header: { paddingBottom: 15, borderBottomWidth: 1, borderColor: '#d5dfeb' },
  heading: { fontWeight: 700, marginBottom: 4 },
  parties: { flexDirection: 'row', gap: 12, marginVertical: 15 },
  party: { flexGrow: 1, flexBasis: 0 },
  blue: { color: '#17488d', fontWeight: 700 },
  muted: { color: '#526479' },
  tableHeading: { fontWeight: 700, backgroundColor: '#f4f6f8' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#d9dfe7' },
  cell: { paddingVertical: 5, paddingHorizontal: 5 },
  numerical: { textAlign: 'right' },
  summary: { marginTop: 4, borderTopWidth: 2, borderColor: '#182230', paddingTop: 3 },
  summaryLabel: { textAlign: 'right', width: '100%', fontWeight: 700 },
  summaryValue: { width: 112, textAlign: 'right', paddingHorizontal: 8 },
  currency: { width: 35, textAlign: 'right', paddingRight: 5 },
  amountWords: {
    fontWeight: 700,
    backgroundColor: '#f4f6f8',
    borderTopWidth: 1,
    borderColor: '#d5dfeb',
    padding: 6,
    marginTop: 5,
  },
  section: { marginTop: 12 },
  paragraph: { marginBottom: 4 },
  signatures: { flexDirection: 'row', gap: 34, marginTop: 24, color: '#4d5a68' },
  signatureSlot: { flexGrow: 1, flexBasis: 0, textAlign: 'center' },
  signatureSpace: { height: 48, alignItems: 'center', justifyContent: 'center' },
  signatureImage: { width: 122, height: 44, objectFit: 'contain' },
  signatureLine: { paddingTop: 5, borderTopWidth: 0.8, borderColor: '#8c96a3' },
});

type HtmlNode = DefaultTreeAdapterTypes.ChildNode;

function PaperText({ children, style }: { children: string; style?: TextProps['style'] }) {
  return (
    <Text style={style} hyphenationCallback={segmentWord}>
      {shapeThai(children)}
    </Text>
  );
}

function inline(node: HtmlNode, key: number): ReactNode {
  if (tree.isTextNode(node)) {
    return shapeThai(
      tree.getTextNodeContent(node).replace(/^ +/, (spaces) => '\u00a0'.repeat(spaces.length))
    );
  }
  if (!tree.isElementNode(node)) return null;
  const tag = tree.getTagName(node);
  if (tag === 'br') return '\n';
  return (
    <Text
      key={key}
      style={{
        ...(tag === 'strong' || tag === 'b' ? { fontWeight: 700 } : {}),
        ...(tag === 'u' ? { textDecoration: 'underline' } : {}),
        ...(tag === 's' ? { textDecoration: 'line-through' } : {}),
      }}
    >
      {tree.getChildNodes(node).map(inline)}
    </Text>
  );
}

function richBlock(node: HtmlNode, key: number): ReactNode {
  if (tree.isTextNode(node)) {
    const value = tree.getTextNodeContent(node);
    return value.trim() ? (
      <PaperText key={key} style={styles.paragraph}>
        {value}
      </PaperText>
    ) : null;
  }
  if (!tree.isElementNode(node)) return null;
  const tag = tree.getTagName(node);
  const children = tree.getChildNodes(node);
  if (tag === 'ul' || tag === 'ol') {
    const start = Number(tree.getAttrList(node).find((attr) => attr.name === 'start')?.value ?? 1);
    return (
      <View key={key} style={{ paddingLeft: 12, marginBottom: 4 }}>
        {children
          .filter((item) => tree.isElementNode(item) && tree.getTagName(item) === 'li')
          .map((item, index) => (
            <View key={index} style={styles.row}>
              <PaperText style={{ width: 20 }}>
                {tag === 'ol' ? `${start + index}.` : '•'}
              </PaperText>
              <View style={{ flex: 1 }}>
                {tree.getChildNodes(item as DefaultTreeAdapterTypes.Element).map(richBlock)}
              </View>
            </View>
          ))}
      </View>
    );
  }
  if (tag === 'hr')
    return (
      <View key={key} style={{ borderBottomWidth: 0.8, borderColor: '#d5dfeb', marginBottom: 4 }} />
    );
  if (tag === 'blockquote')
    return (
      <View key={key} style={{ paddingLeft: 12 }}>
        {children.map(richBlock)}
      </View>
    );

  const alignment = tree
    .getAttrList(node)
    .find((attr) => attr.name === 'style')
    ?.value.split(':')[1];
  const textAlign =
    alignment === 'center' || alignment === 'right' || alignment === 'justify' ? alignment : 'left';
  const heading = /^h[1-6]$/.test(tag);
  return (
    <Text
      key={key}
      hyphenationCallback={segmentWord}
      style={[styles.paragraph, { textAlign, ...(heading && { fontWeight: 700 }) }]}
    >
      {children.length ? children.map(inline) : '\u00a0'}
    </Text>
  );
}

function TextSection({
  value,
  rich,
  heading,
}: {
  value?: string;
  rich: boolean;
  heading?: string;
}) {
  const content = rich ? sanitizeSalesDocumentText(value ?? '') : value;
  if (!content) return null;
  return (
    <View style={styles.section}>
      {heading && <PaperText style={styles.heading}>{heading}</PaperText>}
      {rich ? (
        tree.getChildNodes(parseFragment(content)).map(richBlock)
      ) : (
        <PaperText>{content}</PaperText>
      )}
    </View>
  );
}

async function loadLogo(logoUrl?: string | null) {
  if (!logoUrl) return undefined;
  try {
    const url = new URL(logoUrl);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://invalid.invalid');
    const isPublicStorage =
      url.origin === project.origin && url.pathname.startsWith('/storage/v1/object/public/');
    const isBrandAsset = url.origin === 'https://e-kru.com' && url.pathname.startsWith('/logo/');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (!isPublicStorage && !isBrandAsset)
    )
      return undefined;

    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok || !response.body) return undefined;
    const chunks: Buffer[] = [];
    let size = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(Buffer.from(value));
    }
    const input = sharp(Buffer.concat(chunks), { limitInputPixels: 4_000_000 });
    const metadata = await input.metadata();
    if (!metadata.format || !['png', 'jpeg', 'webp'].includes(metadata.format)) return undefined;
    return await input
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return undefined;
  }
}

export async function renderSalesQuotationPdf({
  content,
  documentNumber,
  issuedAt,
}: {
  content: SalesDocumentContent;
  documentNumber: string;
  issuedAt: string | null;
}) {
  const logo = await loadLogo(content.seller.logoUrl);
  const signature = salesSignatureSchema.safeParse(content.seller.signatureImage);
  const signatureImage = content.seller.showSignature && signature.success ? signature.data : null;
  const totals = salesDocumentTotals(content);
  const rich = content.textFormat === 'html';
  const rows = [
    ['รวมเป็นเงิน (Subtotal)', totals.subtotal],
    ['หักส่วนลดพิเศษ (Special Discount)', content.discountSatang],
    ...(content.taxBasisPoints
      ? [[`ภาษี ${content.taxBasisPoints / 100}%`, totals.tax] as const]
      : []),
    ['รวมเป็นเงินทั้งสิ้น (Total)', totals.total],
  ] as const;
  const width = ['44%', '12%', '22%', '22%'];
  return renderToBuffer(
    <Document title={`ใบเสนอราคา ${documentNumber}`} language="th">
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <View style={styles.row}>
            <View style={[styles.row, { flex: 1, paddingRight: 10 }]}>
              {logo && <Image style={styles.logo} src={{ data: logo, format: 'png' }} />}
              <View style={{ flex: 1 }}>
                <PaperText style={styles.title}>ใบเสนอราคา</PaperText>
                <PaperText style={styles.muted}>{content.title}</PaperText>
              </View>
            </View>
            <View>
              <PaperText style={[styles.blue, styles.numerical]}>ต้นฉบับ</PaperText>
              <PaperText
                style={[styles.number, styles.numerical]}
              >{`เลขที่ ${documentNumber}`}</PaperText>
              <PaperText style={styles.numerical}>
                {issuedAt
                  ? `วันที่ออกเอกสาร ${day(issuedAt)}`
                  : `วันที่เอกสาร ${day(content.documentDate)}`}
              </PaperText>
              <PaperText
                style={styles.numerical}
              >{`วันหมดอายุ ${content.dueDate ? day(content.dueDate) : '—'}`}</PaperText>
            </View>
          </View>
          {content.reference && (
            <PaperText style={{ marginTop: 6 }}>{`อ้างอิง ${content.reference}`}</PaperText>
          )}
        </View>
        <View style={styles.parties} wrap={false}>
          {(
            [
              ['ผู้ขาย', content.seller],
              ['ลูกค้า', content.customer],
            ] as const
          ).map(([label, party]) => (
            <View key={label} style={styles.party}>
              <PaperText style={styles.blue}>{label}</PaperText>
              <PaperText style={styles.heading}>{party.name || '—'}</PaperText>
              {party.address && <PaperText style={styles.muted}>{party.address}</PaperText>}
              {party.taxId && (
                <PaperText
                  style={styles.muted}
                >{`เลขประจำตัวผู้เสียภาษี ${party.taxId}`}</PaperText>
              )}
            </View>
          ))}
        </View>
        <View style={[styles.tableRow, styles.tableHeading]} wrap={false} minPresenceAhead={25}>
          {['สินค้า / บริการ', 'จำนวน', 'ราคาต่อหน่วย', 'จำนวนเงิน'].map((label, index) => (
            <PaperText
              key={label}
              style={[styles.cell, { width: width[index] }, ...(index ? [styles.numerical] : [])]}
            >
              {label}
            </PaperText>
          ))}
        </View>
        {content.items.map((item, index) => (
          <View key={index} style={styles.tableRow} wrap={false}>
            {[
              item.description,
              String(item.quantity),
              money(item.unitPriceSatang),
              money(item.quantity * item.unitPriceSatang),
            ].map((label, column) => (
              <PaperText
                key={column}
                style={[
                  styles.cell,
                  { width: width[column] },
                  ...(column ? [styles.numerical] : []),
                ]}
              >
                {label}
              </PaperText>
            ))}
          </View>
        ))}
        <View style={styles.summary} wrap={false}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <View style={{ flex: 1 }}>
                <PaperText style={styles.summaryLabel}>{label}</PaperText>
              </View>
              <PaperText style={styles.summaryValue}>{money(value)}</PaperText>
              <PaperText style={styles.currency}>บาท</PaperText>
            </View>
          ))}
          <PaperText
            style={styles.amountWords}
          >{`จำนวนเงิน (Amount) ${salesDocumentBahtText(totals.total)}`}</PaperText>
        </View>
        <TextSection value={content.details} rich={rich} />
        <TextSection heading="เงื่อนไข" value={content.conditions} rich={rich} />
        <TextSection heading="หมายเหตุ" value={content.notes} rich={rich} />
        <View style={styles.signatures} wrap={false}>
          <View style={styles.signatureSlot}>
            <View style={styles.signatureSpace}>
              {signatureImage && <Image style={styles.signatureImage} src={signatureImage} />}
            </View>
            <PaperText style={styles.signatureLine}>ลงชื่อผู้เสนอราคา</PaperText>
            <PaperText>{`( ${content.seller.name || '....................................'} )`}</PaperText>
          </View>
          <View style={styles.signatureSlot}>
            <View style={styles.signatureSpace} />
            <PaperText style={styles.signatureLine}>ลงชื่อผู้อนุมัติ</PaperText>
            <PaperText>( .................................... )</PaperText>
            <PaperText>วันที่ ............ / ............ / ................</PaperText>
          </View>
        </View>
      </Page>
    </Document>
  );
}
