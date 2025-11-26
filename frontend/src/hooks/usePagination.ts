import { useUrlFilters } from './useUrlFilters';
import { useCallback, useRef, useEffect } from 'react';

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

  // Use refs to avoid stale closure issues in callbacks
  const currentPageRef = useRef(currentPage);
  const pageSizeRef = useRef(pageSize);

  // Keep refs in sync with current values
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

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

    // Always update - let the URL be the source of truth
    // Using ref to get current value avoids stale closure
    if (sanitizedPage !== currentPageRef.current) {
      setFilter('page', sanitizedPage.toString());
    }
  }, [defaultPage, setFilter]);

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

    // Only update if value has changed (using ref for current value)
    if (sanitizedSize !== pageSizeRef.current) {
      // Update both page_size and page atomically to prevent race conditions
      setFilters({
        page_size: sanitizedSize.toString(),
        page: '1', // Reset to first page when changing page size
      });
    }
  }, [defaultPageSize, maxPageSize, setFilters]);

  return {
    currentPage,
    pageSize,
    setPage,
    setPageSize,
  };
}
