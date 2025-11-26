import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Custom hook to manage filter state in URL query parameters
 * Enables bookmarkable filter states
 */
export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get all current filters as an object
  const filters = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  // Update a single filter - uses functional update to avoid stale closure
  const setFilter = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  // Update multiple filters at once - uses functional update to avoid stale closure
  const setFilters = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === '') {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
        });
        return newParams;
      });
    },
    [setSearchParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Get a specific filter value
  const getFilter = useCallback(
    (key: string, defaultValue: string = '') => {
      return searchParams.get(key) || defaultValue;
    },
    [searchParams]
  );

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    getFilter,
  };
}
