import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Layout from '../components/layout/Layout';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

// ============================================
// LAZY LOADED COMPONENTS
// ============================================

// Auth pages (loaded immediately since they're entry points)
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import LandingPage from '../features/landing/LandingPage';

// Profile - lazy loaded
const ProfilePage = React.lazy(() => import('../features/profile/ProfilePage'));

// Purchase Request Components - lazy loaded
const RequestsListPage = React.lazy(() => import('../features/requests/RequestsListPage'));
const CreateRequestPage = React.lazy(() => import('../features/requests/CreateRequestPageWithModal'));
const EditRequestPage = React.lazy(() => import('../features/requests/EditRequestPage'));
const RequestDetailPage = React.lazy(() => import('../features/requests/RequestDetailPage'));

// Purchase Order Components - lazy loaded
const PurchaseOrdersPage = React.lazy(() =>
  import('../features/purchase-orders/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage }))
);
const PurchaseOrderDetailPage = React.lazy(() =>
  import('../features/purchase-orders/PurchaseOrderDetailPage').then(m => ({ default: m.PurchaseOrderDetailPage }))
);

// Receipt Components - lazy loaded
const UploadReceiptPage = React.lazy(() =>
  import('../features/receipts/UploadReceiptPage').then(m => ({ default: m.UploadReceiptPage }))
);
const ReceiptValidationPage = React.lazy(() =>
  import('../features/receipts/ReceiptValidationPage').then(m => ({ default: m.ReceiptValidationPage }))
);
const ReceiptsListPage = React.lazy(() =>
  import('../features/receipts/ReceiptsListPage').then(m => ({ default: m.ReceiptsListPage }))
);

// Dashboard Components - lazy loaded
const StaffDashboard = React.lazy(() => import('../features/staff/StaffDashboard'));
const ApproverDashboard = React.lazy(() =>
  import('../features/approver/ApproverDashboard').then(m => ({ default: m.ApproverDashboard }))
);
const FinanceDashboardPage = React.lazy(() =>
  import('../features/finance/FinanceDashboardPage').then(m => ({ default: m.FinanceDashboardPage }))
);
const ExportHistoryPage = React.lazy(() =>
  import('../features/finance/ExportHistoryPage').then(m => ({ default: m.ExportHistoryPage }))
);

// Admin Components - lazy loaded
const AdminDashboard = React.lazy(() =>
  import('../features/admin').then(m => ({ default: m.AdminDashboard }))
);
const UserManagement = React.lazy(() =>
  import('../features/admin').then(m => ({ default: m.UserManagement }))
);
const UserForm = React.lazy(() =>
  import('../features/admin').then(m => ({ default: m.UserForm }))
);

// ============================================
// ROUTE COMPONENTS
// ============================================

// Show landing page for guests, redirect authenticated users to dashboard
const LandingOrDashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) return <LandingPage />;

  const roleRoutes: Record<UserRole, string> = {
    STAFF: '/staff/dashboard',
    APPROVER_L1: '/approver/dashboard',
    APPROVER_L2: '/approver/dashboard',
    FINANCE: '/finance/dashboard',
    ADMIN: '/admin/dashboard',
  };

  return <Navigate to={roleRoutes[user.role] || '/staff/dashboard'} replace />;
};

const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Unauthorized</h1>
      <p className="text-gray-600">You do not have permission to access this page.</p>
    </div>
  </div>
);

// Suspense wrapper for lazy components in routes
const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingOrDashboard />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '/staff',
    element: (
      <ProtectedRoute allowedRoles={['STAFF']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <SuspenseWrapper><StaffDashboard /></SuspenseWrapper>,
      },
      {
        path: 'requests',
        element: <SuspenseWrapper><RequestsListPage /></SuspenseWrapper>,
      },
      {
        path: 'requests/create',
        element: <SuspenseWrapper><CreateRequestPage /></SuspenseWrapper>,
      },
      {
        path: 'requests/:id/edit',
        element: <SuspenseWrapper><EditRequestPage /></SuspenseWrapper>,
      },
      {
        path: 'requests/:id',
        element: <SuspenseWrapper><RequestDetailPage /></SuspenseWrapper>,
      },
      {
        path: 'purchase-orders',
        element: <SuspenseWrapper><PurchaseOrdersPage /></SuspenseWrapper>,
      },
      {
        path: 'purchase-orders/:poId',
        element: <SuspenseWrapper><PurchaseOrderDetailPage /></SuspenseWrapper>,
      },
      {
        path: 'purchase-orders/:poId/upload-receipt',
        element: <SuspenseWrapper><UploadReceiptPage /></SuspenseWrapper>,
      },
      {
        path: 'receipts/:receiptId/validate',
        element: <SuspenseWrapper><ReceiptValidationPage /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '/approver',
    element: (
      <ProtectedRoute allowedRoles={['APPROVER_L1', 'APPROVER_L2']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <SuspenseWrapper><ApproverDashboard /></SuspenseWrapper>,
      },
      {
        path: 'requests/:id',
        element: <SuspenseWrapper><RequestDetailPage /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '/finance',
    element: (
      <ProtectedRoute allowedRoles={['FINANCE']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <SuspenseWrapper><FinanceDashboardPage /></SuspenseWrapper>,
      },
      {
        path: 'requests',
        element: <SuspenseWrapper><RequestsListPage /></SuspenseWrapper>,
      },
      {
        path: 'requests/:id',
        element: <SuspenseWrapper><RequestDetailPage /></SuspenseWrapper>,
      },
      {
        path: 'purchase-orders',
        element: <SuspenseWrapper><PurchaseOrdersPage /></SuspenseWrapper>,
      },
      {
        path: 'purchase-orders/:poId',
        element: <SuspenseWrapper><PurchaseOrderDetailPage /></SuspenseWrapper>,
      },
      {
        path: 'purchase-orders/:poId/upload-receipt',
        element: <SuspenseWrapper><UploadReceiptPage /></SuspenseWrapper>,
      },
      {
        path: 'receipts',
        element: <SuspenseWrapper><ReceiptsListPage /></SuspenseWrapper>,
      },
      {
        path: 'receipts/:receiptId/validate',
        element: <SuspenseWrapper><ReceiptValidationPage /></SuspenseWrapper>,
      },
      {
        path: 'export-history',
        element: <SuspenseWrapper><ExportHistoryPage /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <SuspenseWrapper><AdminDashboard /></SuspenseWrapper>,
      },
      {
        path: 'users',
        element: <SuspenseWrapper><UserManagement /></SuspenseWrapper>,
      },
      {
        path: 'users/new',
        element: <SuspenseWrapper><UserForm /></SuspenseWrapper>,
      },
      {
        path: 'users/:userId',
        element: <SuspenseWrapper><UserForm /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
