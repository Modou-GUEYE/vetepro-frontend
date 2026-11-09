export interface PageParams {
  page: number;
  pageSize: number;
  sort?: string;
  q?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;

/** Convertit les paramètres de liste vers la query string de l'API. */
export function toQuery({ page, pageSize, sort, q }: PageParams) {
  return { page, page_size: pageSize, ...(sort ? { sort } : {}), ...(q ? { q } : {}) };
}

export const pageCount = (total: number, pageSize: number) =>
  Math.max(1, Math.ceil(total / pageSize));
