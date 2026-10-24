export const purchaseStatusLabels = {
  draft: 'แบบร่าง',
  submitted: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว / รอใบสั่งซื้อ',
  rejected: 'ปฏิเสธ',
  ordered: 'รอรับเข้า',
  partially_received: 'รับเข้าบางส่วน',
  received: 'รับเข้าครบแล้ว',
};
export function purchaseDocumentNumber(number: number) {
  return `PR-${String(number).padStart(6, '0')}`;
}
export function purchaseDocumentDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(
        new Date(value)
      )
    : '—';
}
