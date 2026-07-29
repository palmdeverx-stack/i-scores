import 'server-only';

import { sendEmail } from 'src/lib/resend';
import { escapeEmailHtml, renderBrandedEmail } from 'src/lib/branded-email-template';

// ----------------------------------------------------------------------

export async function sendMarketplaceSchoolInviteEmail(params: {
  to: string;
  schoolName: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: string;
  recipientHasAccount: boolean;
}): Promise<void> {
  const { to, schoolName, inviterName, inviteUrl, expiresAt, recipientHasAccount } = params;
  const expiration = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(expiresAt));

  const html = renderBrandedEmail({
    preheader: `คำเชิญเข้าร่วม ${schoolName} บน E-KRU Marketplace`,
    title: 'ตอบรับคำเชิญเข้าร่วมโรงเรียน',
    actionLabel: 'ดูและยอมรับคำเชิญ',
    actionUrl: inviteUrl,
    contentHtml: `
      <p style="margin:0 0 14px;">
        <strong style="color:#1f2937;">${escapeEmailHtml(inviterName)}</strong>
        เชิญคุณเข้าร่วม
        <strong style="color:#1f2937;">${escapeEmailHtml(schoolName)}</strong>
        บน E-KRU Marketplace
      </p>
      <p style="margin:0;">
        ${
          recipientHasAccount
            ? 'เข้าสู่ระบบด้วยอีเมลที่ได้รับคำเชิญ แล้วกดยอมรับเพื่อรับสิทธิ์ของโรงเรียน'
            : 'ยังไม่มีบัญชีก็สามารถกดปุ่มด้านล่าง สมัครด้วยอีเมลนี้หรือ Google แล้วกลับมาตอบรับคำเชิญได้ทันที'
        }
      </p>
    `,
    footerHtml: `
      ลิงก์นี้ใช้ได้ถึง ${escapeEmailHtml(expiration)} และใช้ได้หนึ่งครั้ง<br>
      หากคุณไม่รู้จักโรงเรียนนี้ สามารถละเว้นอีเมลฉบับนี้ได้
    `,
  });

  await sendEmail({
    to,
    subject: `คำเชิญเข้าร่วม ${schoolName} บน eKru Marketplace`,
    html,
  });
}
