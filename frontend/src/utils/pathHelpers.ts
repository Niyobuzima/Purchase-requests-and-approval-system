import type { UserRole } from '@/types';

/**
 * Get the base path for navigation based on user role
 * @param role - The user's role
 * @returns The base path string (e.g., '/finance', '/staff', '/admin', '/approver')
 */
export const getBasePath = (role?: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'FINANCE':
      return '/finance';
    case 'APPROVER_L1':
    case 'APPROVER_L2':
      return '/approver';
    default:
      return '/staff';
  }
};
