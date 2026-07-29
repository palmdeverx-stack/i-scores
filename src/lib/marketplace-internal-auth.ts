import 'server-only';

import { timingSafeEqual } from 'node:crypto';

// ----------------------------------------------------------------------

export function isValidMarketplaceProvisionSecret(request: Request): boolean {
  const secret = process.env.MARKETPLACE_PROVISION_SECRET;
  const provided = request.headers.get('authorization') ?? '';
  const expected = secret ? `Bearer ${secret}` : '';
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    Boolean(secret) &&
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
