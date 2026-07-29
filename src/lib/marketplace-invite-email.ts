import 'server-only';

import { sendEmail } from 'src/lib/resend';

// ----------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="margin-bottom: 8px;">คำเชิญเข้าร่วมโรงเรียนบน Marketplace</h2>
      <p style="color: #555;">
        <b>${escapeHtml(inviterName)}</b> เชิญคุณเข้าร่วม
        <b>${escapeHtml(schoolName)}</b> บน eKru Marketplace
      </p>
      <p style="color: #555;">
        ${
          recipientHasAccount
            ? 'กรุณาเข้าสู่ระบบด้วยอีเมลที่ได้รับคำเชิญ แล้วกดยอมรับคำเชิญ'
            : 'คุณยังไม่จำเป็นต้องมีบัญชี Marketplace กดปุ่มด้านล่างเพื่อสมัครด้วยอีเมลนี้หรือ Google แล้วระบบจะพากลับมายอมรับคำเชิญ'
        }
      </p>
      <p style="margin: 28px 0;">
        <a href="${escapeHtml(inviteUrl)}" style="background: #2563eb; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none;">
          ดูและยอมรับคำเชิญ
        </a>
      </p>
      <p style="color: #777; font-size: 13px;">ลิงก์นี้ใช้ได้ถึง ${escapeHtml(expiration)} และใช้ได้หนึ่งครั้ง</p>
      <p style="color: #999; font-size: 13px;">หากคุณไม่รู้จักโรงเรียนนี้ สามารถละเว้นอีเมลฉบับนี้ได้</p>
    </div>
  `;

  await sendEmail({
    to,
    subject: `คำเชิญเข้าร่วม ${schoolName} บน eKru Marketplace`,
    html,
  });
}
