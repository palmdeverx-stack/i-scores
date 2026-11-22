import { z } from 'zod';

export const salesDocumentLogoSchema = z.url({ protocol: /^https$/ }).max(2048);
