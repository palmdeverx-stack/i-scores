import 'server-only';

import nodemailer from 'nodemailer';

export class GmailEmailError extends Error {}

function getGmailConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
  return user && /^[^\s@<>]+@gmail\.com$/i.test(user) && pass ? { user, pass } : null;
}

export function getGmailSender() {
  const config = getGmailConfig();
  return config ? `E-KRU <${config.user}>` : null;
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

export async function sendGmailEmail(params: OutgoingEmail) {
  const auth = getGmailConfig();
  if (!auth) {
    throw new GmailEmailError('ยังไม่ได้ตั้งค่าบัญชีหรือรหัสผ่านแอป Gmail สำหรับส่งอีเมล');
  }

  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      from: { name: 'E-KRU', address: auth.user },
      to: { name: '', address: params.to },
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });
    if (result.accepted?.length !== 1 || result.rejected?.length) {
      throw new GmailEmailError('Gmail ไม่รับอีเมลผู้รับ กรุณาตรวจสอบที่อยู่อีเมลแล้วลองใหม่');
    }
  } catch (error) {
    if (error instanceof GmailEmailError) throw error;
    const authFailed =
      error && typeof error === 'object' && 'code' in error && error.code === 'EAUTH';
    throw new GmailEmailError(
      authFailed
        ? 'Gmail ปฏิเสธการยืนยันตัวตน กรุณาตรวจสอบรหัสผ่านแอป Gmail'
        : 'ส่งอีเมลผ่าน Gmail ไม่สำเร็จ'
    );
  } finally {
    transport.close();
  }
}
