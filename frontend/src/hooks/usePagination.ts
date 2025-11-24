import { useUrlFilters } from './useUrlFilters';

interface UsePaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

interface UsePaginationResult {
  currentPage: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Custom hook to manage pagination state from URL parameters
 * with validation to prevent NaN and enforce sensible limits
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const {
    defaultPage = 1,
    defaultPageSize = 20,
    maxPageSize = 100,
  } = options;

  const { getFilter, setFilter } = useUrlFilters();

  // Parse and validate page number
  const parsedPage = parseInt(getFilter('page', defaultPage.toString()), 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : defaultPage;

  // Parse and validate page size with max limit
  const parsedPageSize = parseInt(getFilter('page_size', defaultPageSize.toString()), 10);
  const pageSize = 
    Number.isFinite(parsedPageSize) && 
    parsedPageSize >= 1 && 
    parsedPageSize <= maxPageSize 
      ? parsedPageSize 
      : defaultPageSize;

  const setPage = (page: number) => {
    setFilter('page', page.toString());
  };

  const setPageSize = (size: number) => {
    setFilter('page_size', size.toString());
    setFilter('page', '1'); // Reset to first page when changing page size
  };

  return {
    currentPage,
    pageSize,
    setPage,
    setPageSize,
  };
}
