import { InquiryStatus, type ListInquiriesParams } from '@/api/generated/model';

export const INQUIRIES_PAGE_SIZE = 15;

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  [InquiryStatus.NEW]: 'Nueva',
  [InquiryStatus.RESPONDED]: 'Respondida',
  [InquiryStatus.CLOSED]: 'Cerrada',
};

/** The same statuses as a filter of the list, in plural. */
export const INQUIRY_STATUS_FILTER_LABELS: Record<InquiryStatus, string> = {
  [InquiryStatus.NEW]: 'Nuevas',
  [InquiryStatus.RESPONDED]: 'Respondidas',
  [InquiryStatus.CLOSED]: 'Cerradas',
};

export const INQUIRY_STATUS_COLORS: Record<InquiryStatus, string> = {
  [InquiryStatus.NEW]: 'orange',
  [InquiryStatus.RESPONDED]: 'green',
  [InquiryStatus.CLOSED]: 'gray',
};

/**
 * What the inbox shows, kept in the address so it survives a reload and going back: `?q=remera&status=new&page=2`.
 * The status goes in lower case and the page starts at 1; anything unknown is ignored.
 */
export interface InquiryFilters {
  query: string;
  status: InquiryStatus | null;
  page: number;
}

export function readInquiryFilters(params: URLSearchParams): InquiryFilters {
  const slug = params.get('status');
  const page = Number(params.get('page'));
  return {
    query: params.get('q')?.trim() ?? '',
    status: Object.values(InquiryStatus).find((value) => value.toLowerCase() === slug) ?? null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function writeInquiryFilters(filters: InquiryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.status) params.set('status', filters.status.toLowerCase());
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function toInquiryParams(filters: InquiryFilters): ListInquiriesParams {
  return {
    ...(filters.query && { q: filters.query }),
    ...(filters.status && { status: filters.status }),
    ...(filters.page > 1 && { page: filters.page - 1 }),
    size: INQUIRIES_PAGE_SIZE,
  };
}

/** What the detail of an inquiry needs to go back to the inbox as it was: the search, the status and the page. */
export interface InquiryListState {
  listSearch: string;
}

/** The search of the inbox the detail was opened from, kept in the state of the navigation; empty without it. */
export function listSearchOf(state: unknown): string {
  return (state as Partial<InquiryListState> | null)?.listSearch ?? '';
}
