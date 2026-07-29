import 'server-only';

// ----------------------------------------------------------------------

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderBrandedEmail(params: {
  preheader: string;
  title: string;
  contentHtml: string;
  actionLabel: string;
  actionUrl: string;
  footerHtml?: string;
}): string {
  const { preheader, title, contentHtml, actionLabel, actionUrl, footerHtml } = params;

  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeEmailHtml(title)}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .email-shell { width: 100% !important; }
        .email-card { padding: 36px 24px !important; border-radius: 16px !important; }
        .email-title { font-size: 25px !important; line-height: 34px !important; }
        .email-button { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f3f6fb;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeEmailHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="width:100%; background:#f3f6fb; border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:64px 20px 28px;">
          <table class="email-shell" role="presentation" width="600" cellspacing="0" cellpadding="0"
            border="0" style="width:600px; max-width:600px; border-collapse:separate;">
            <tr>
              <td class="email-card" style="padding:52px 56px; background:#ffffff; border-radius:22px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:0 0 36px;">
                      <span style="font-family:Arial,'Helvetica Neue',sans-serif; font-size:30px;
                        line-height:36px; font-weight:800; letter-spacing:-1px; color:#2563eb;">
                        E-KRU
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td class="email-title" style="padding:0 0 18px; font-family:Arial,'Noto Sans Thai',
                      Tahoma,sans-serif; font-size:28px; line-height:38px; font-weight:700; color:#1f2937;">
                      ${escapeEmailHtml(title)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0; font-family:Arial,'Noto Sans Thai',Tahoma,sans-serif;
                      font-size:16px; line-height:27px; color:#4b5563;">
                      ${contentHtml}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 0 28px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td bgcolor="#2563eb" style="border-radius:9px;">
                            <a class="email-button" href="${escapeEmailHtml(actionUrl)}"
                              style="display:inline-block; padding:15px 24px; border:1px solid #2563eb;
                              border-radius:9px; background:#2563eb; color:#ffffff;
                              font-family:Arial,'Noto Sans Thai',Tahoma,sans-serif; font-size:16px;
                              line-height:20px; font-weight:700; text-decoration:none;">
                              ${escapeEmailHtml(actionLabel)}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:Arial,'Noto Sans Thai',Tahoma,sans-serif; font-size:16px;
                      line-height:26px; color:#374151;">
                      — ทีมงาน E-KRU
                    </td>
                  </tr>
                  ${
                    footerHtml
                      ? `<tr>
                    <td style="padding-top:30px; font-family:Arial,'Noto Sans Thai',Tahoma,sans-serif;
                      font-size:13px; line-height:21px; color:#8491a3;">
                      ${footerHtml}
                    </td>
                  </tr>`
                      : ''
                  }
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 20px 0; font-family:Arial,'Noto Sans Thai',
                Tahoma,sans-serif; font-size:12px; line-height:20px; color:#8b98aa;">
                อีเมลนี้ส่งโดยระบบ E-KRU · ระบบบริหารจัดการสถานศึกษา
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
