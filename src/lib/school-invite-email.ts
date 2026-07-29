import 'server-only';

import { sendEmail } from 'src/lib/resend';
import { escapeEmailHtml, renderBrandedEmail } from 'src/lib/branded-email-template';

// ----------------------------------------------------------------------

export async function sendSchoolInviteEmail(params: {
  to: string;
  schoolName: string;
  schoolCode: string;
  adminUsername: string;
  adminPassword: string;
  signInUrl: string;
}): Promise<void> {
  const { to, schoolName, schoolCode, adminUsername, adminPassword, signInUrl } = params;

  const html = renderBrandedEmail({
    preheader: `บัญชีผู้ดูแลโรงเรียน ${schoolName} พร้อมใช้งานแล้ว`,
    title: 'ยินดีต้อนรับสู่ระบบ E-KRU',
    actionLabel: 'เข้าสู่ระบบ E-KRU',
    actionUrl: signInUrl,
    contentHtml: `
      <p style="margin:0 0 14px;">
        โรงเรียน <strong style="color:#1f2937;">${escapeEmailHtml(schoolName)}</strong>
        (รหัสโรงเรียน ${escapeEmailHtml(schoolCode)}) ถูกสร้างเรียบร้อยแล้ว
      </p>
      <p style="margin:0 0 14px;">ใช้ข้อมูลต่อไปนี้เพื่อเข้าสู่ระบบครั้งแรกในฐานะผู้ดูแลโรงเรียน</p>
      <table role="presentation" style="width:100%; border-collapse:collapse; margin:16px 0;
        background:#f8fafc; border-radius:10px;">
        <tr>
          <td style="padding:12px 14px; color:#7b8798;">ชื่อผู้ใช้งาน</td>
          <td style="padding:12px 14px; font-family:monospace; color:#1f2937;">${escapeEmailHtml(adminUsername)}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px; color:#7b8798;">รหัสผ่านชั่วคราว</td>
          <td style="padding:12px 14px; font-family:monospace; color:#1f2937;">${escapeEmailHtml(adminPassword)}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px; color:#7b8798;">รหัสโรงเรียน (PIN)</td>
          <td style="padding:12px 14px; font-family:monospace; color:#1f2937;">${escapeEmailHtml(schoolCode)}</td>
        </tr>
      </table>
      <p style="margin:0;">ระบบจะให้เปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรก</p>
    `,
    footerHtml: 'หากคุณไม่ได้เป็นผู้ดำเนินการนี้ กรุณาติดต่อผู้ดูแลระบบ E-KRU',
  });

  await sendEmail({
    to,
    subject: `เชิญเข้าใช้งานระบบ eKru — โรงเรียน${schoolName}`,
    html,
  });
}
