import type { UserRole } from '@/types';

/**
 * Get the base path for navigation based on user role
 * @param role - The user's role
 * @returns The base path string (e.g., '/finance' or '/staff')
 */
export const getBasePath = (role?: UserRole): string => {
  if (role === 'FINANCE') {
    return '/finance';
  }
  return '/staff';
};
