import { useUrlFilters } from './useUrlFilters';
import { useCallback } from 'react';

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

  const { getFilter, setFilter, setFilters } = useUrlFilters();

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

  const setPage = useCallback((page: number) => {
    // Validate and sanitize page input
    let sanitizedPage: number;

    // Handle NaN, Infinity, or non-finite values
    if (!Number.isFinite(page)) {
      sanitizedPage = defaultPage;
    } else {
      // Ensure integer and clamp to minimum of 1
      sanitizedPage = Math.max(1, Math.floor(page));
    }

    // Only update if value has changed
    if (sanitizedPage !== currentPage) {
      setFilter('page', sanitizedPage.toString());
    }
  }, [currentPage, defaultPage, setFilter]);

  const setPageSize = useCallback((size: number) => {
    // Validate and sanitize page size input
    let sanitizedSize: number;

    // Handle NaN, Infinity, or non-finite values
    if (!Number.isFinite(size)) {
      sanitizedSize = defaultPageSize;
    } else {
      // Ensure integer and clamp to valid range [1, maxPageSize]
      sanitizedSize = Math.max(1, Math.min(maxPageSize, Math.floor(size)));
    }

    // Only update if value has changed
    if (sanitizedSize !== pageSize) {
      // Update both page_size and page atomically to prevent race conditions
      setFilters({
        page_size: sanitizedSize.toString(),
        page: '1', // Reset to first page when changing page size
      });
    }
  }, [pageSize, defaultPageSize, maxPageSize, setFilters]);

  return {
    currentPage,
    pageSize,
    setPage,
    setPageSize,
  };
}
