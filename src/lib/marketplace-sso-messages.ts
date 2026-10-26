const messages: Record<string, string> = {
  not_configured: 'ยังไม่ได้ตั้งค่า SSO กรุณาติดต่อผู้ดูแลระบบ',
  wrong_origin: 'กรุณาเริ่ม SSO จากโดเมน E-KRU ที่ตั้งค่าไว้',
  invalid_transaction: 'คำขอ SSO หมดอายุหรือถูกใช้แล้ว กรุณาเริ่มใหม่',
  invalid_destination: 'ปลายทางไม่ถูกต้อง',
  exchange_failed: 'รหัส SSO หมดอายุ ถูกใช้แล้ว หรือยืนยันกับ Marketplace ไม่สำเร็จ กรุณาเริ่มใหม่',
  invalid_identity: 'ข้อมูลยืนยันตัวตนจาก Marketplace ไม่ถูกต้อง',
  identity_conflict: 'บัญชีนี้เชื่อมไว้แล้ว กรุณาตรวจสอบบัญชีที่เข้าสู่ระบบ',
  account_unavailable: 'บัญชีถูกระงับหรือไม่พร้อมใช้งาน',
  school_unavailable: 'โรงเรียนถูกปิดใช้งาน',
  license_unavailable: 'แพ็กเกจหมดอายุ ถูกระงับ หรือไม่รองรับแอปที่ต้องการเปิด',
  existing_login_required: 'กรุณาเข้าสู่ระบบด้วยบัญชี E-KRU เดิมก่อนยืนยันเชื่อมบัญชี',
  pin_required: 'กรุณากรอก PIN 8 หลัก',
  rate_limited: 'ทำรายการบ่อยเกินไป กรุณาลองใหม่ภายหลัง',
  service_unavailable: 'ระบบไม่พร้อมใช้งาน กรุณาลองใหม่',
};
export function marketplaceSsoMessage(code: unknown) {
  return typeof code === 'string' && Object.hasOwn(messages, code)
    ? messages[code]
    : messages.service_unavailable;
}
