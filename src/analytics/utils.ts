// src/analytics/utils.ts
import { PLACEHOLDER } from './config';

export const buildImgUrl = (path: string | null) =>
    path ? `https://skizagroundsuite.com/${path.startsWith('uploads/') ? '' : 'uploads/'}${path}` : PLACEHOLDER;

export const percent = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

export const DEFAULT_FILTERS = {
    query: '',
    parties: [],
    includeRejected: 'all',
    sortBy: 'votes_desc',
} as const;
