const production = process.env.NODE_ENV === 'production';
export const LINE_STATE_COOKIE = production ? '__Host-ekru_line_state' : 'ekru_line_state';
export const LINE_BROWSER_COOKIE = production ? '__Host-ekru_line_browser' : 'ekru_line_browser';
export const lineFlowCookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
};
