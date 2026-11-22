import 'server-only';

import { escapeHtml as escapeEmailHtml } from './escape-html';

export { escapeEmailHtml };

// ----------------------------------------------------------------------

export function renderBrandedEmail(params: {
  preheader: string;
  title: string;
  contentHtml: string;
  actionLabel?: string;
  actionUrl?: string;
  footerHtml?: string;
  logoUrl?: string;
}): string {
  const { preheader, title, contentHtml, actionLabel, actionUrl, footerHtml, logoUrl } = params;
  const centered = Boolean(logoUrl);
  const background = centered ? '#f2f4f6' : '#f3f6fb';
  const width = centered ? 560 : 600;
  const alignment = centered ? 'center' : 'left';
  const textFont = centered
    ? "'LINE Seed Sans TH',Arial,'Noto Sans Thai',Tahoma,sans-serif"
    : "Arial,'Noto Sans Thai',Tahoma,sans-serif";

  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeEmailHtml(title)}</title>
    <style>
      ${
        centered
          ? `
      @font-face {
        font-family: 'LINE Seed Sans TH';
        font-style: normal;
        font-weight: 400;
        src: url('https://e-kru.com/fonts/LINESeedSansTH-Regular.woff2') format('woff2');
      }
      @font-face {
        font-family: 'LINE Seed Sans TH';
        font-style: normal;
        font-weight: 700;
        src: url('https://e-kru.com/fonts/LINESeedSansTH-Bold.woff2') format('woff2');
      }`
          : ''
      }
      @media only screen and (max-width: 640px) {
        .email-shell { width: 100% !important; }
        .email-card { padding: 36px 24px !important; border-radius: 16px !important; }
        .email-title { font-size: 25px !important; line-height: 34px !important; }
        .email-button { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:${background};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeEmailHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="width:100%; background:${background}; border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:${centered ? '18px 16px' : '64px 20px 28px'};">
          <table class="email-shell" role="presentation" width="${width}" cellspacing="0" cellpadding="0"
            border="0" style="width:${width}px; max-width:${centered ? '100%' : '600px'}; border-collapse:separate;">
            <tr>
              <td class="email-card" style="padding:${centered ? '24px 20px 22px' : '52px 56px'}; background:#ffffff; border-radius:${centered ? 16 : 22}px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="${alignment}" style="padding:0 0 ${centered ? 20 : 36}px;">
                      ${
                        logoUrl
                          ? `<img src="${escapeEmailHtml(logoUrl)}" crossorigin="anonymous" alt="EKRU" width="124" height="116"
                        style="display:block; width:124px; height:auto; border:0; color:#2563eb; font-size:24px; font-weight:bold;">`
                          : `<span style="font-family:Arial,'Helvetica Neue',sans-serif; font-size:30px;
                        line-height:36px; font-weight:800; letter-spacing:-1px; color:#2563eb;">
                        EKRU
                      </span>`
                      }
                    </td>
                  </tr>
                  <tr>
                    <td class="email-title" align="${alignment}" style="padding:0 0 ${centered ? 12 : 18}px; font-family:${textFont}; font-size:${centered ? 24 : 28}px; line-height:${centered ? 34 : 38}px; font-weight:700; color:#1f2937;">
                      ${escapeEmailHtml(title)}
                    </td>
                  </tr>
                  <tr>
                    <td align="${alignment}" style="padding:0; font-family:${textFont};
                      font-size:${centered ? 14 : 16}px; line-height:${centered ? 24 : 27}px; color:#4b5563;">
                      ${contentHtml}
                    </td>
                  </tr>
                  ${
                    actionLabel && actionUrl
                      ? `<tr>
                    <td align="${alignment}" style="padding:${centered ? '20px 0 8px' : '30px 0 28px'};">
                      <table align="${alignment}" role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td bgcolor="#2563eb" style="border-radius:9px;">
                            <a class="email-button" href="${escapeEmailHtml(actionUrl)}"
                              style="display:inline-block; padding:15px 24px; border:1px solid #2563eb;
                              border-radius:9px; background:#2563eb; color:#ffffff;
                              font-family:${textFont}; font-size:16px;
                              line-height:20px; font-weight:700; text-decoration:none;">
                              ${escapeEmailHtml(actionLabel)}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>`
                      : ''
                  }
                  ${
                    centered && actionLabel && actionUrl
                      ? `<tr>
                    <td align="center" style="padding:0 0 16px; font-family:${textFont}; font-size:12px; line-height:18px; color:#64748b; overflow-wrap:anywhere;">
                      หากเปิดปุ่มไม่ได้ ให้ใช้ลิงก์นี้<br>
                      <a href="${escapeEmailHtml(actionUrl)}" style="color:#2563eb;">${escapeEmailHtml(actionUrl)}</a>
                    </td>
                  </tr>`
                      : ''
                  }
                  <tr>
                    <td align="${alignment}" style="${centered ? 'padding-bottom:16px;' : ''} font-family:${textFont}; font-size:${centered ? 14 : 16}px;
                      line-height:26px; color:#374151;">
                      — ทีมงาน EKRU
                    </td>
                  </tr>
                  ${
                    footerHtml
                      ? `<tr>
                    <td align="${alignment}" style="${centered ? 'border-top:1px solid #e2e8f0; padding-top:12px;' : 'padding-top:30px;'} font-family:${textFont};
                      font-size:13px; line-height:21px; color:#8491a3;">
                      ${footerHtml}
                    </td>
                  </tr>`
                      : ''
                  }
                </table>
              </td>
            </tr>
            ${
              centered
                ? ''
                : `<tr>
              <td align="center" style="padding:28px 20px 0; font-family:Arial,'Noto Sans Thai',
                Tahoma,sans-serif; font-size:12px; line-height:20px; color:#8b98aa;">
                อีเมลนี้ส่งโดยระบบ EKRU · ระบบบริหารจัดการสถานศึกษา
              </td>
            </tr>`
            }
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
