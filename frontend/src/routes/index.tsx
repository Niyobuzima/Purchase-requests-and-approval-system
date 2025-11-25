import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Layout from '../components/layout/Layout';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import ProfilePage from '../features/profile/ProfilePage';
import LandingPage from '../features/landing/LandingPage';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

// Show landing page for guests, redirect authenticated users to dashboard
const LandingOrDashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
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

// Purchase Request Components
import RequestsListPage from '../features/requests/RequestsListPage';
import CreateRequestPage from '../features/requests/CreateRequestPageWithModal';
import EditRequestPage from '../features/requests/EditRequestPage';
import RequestDetailPage from '../features/requests/RequestDetailPage';

// Purchase Order Components
import { PurchaseOrdersPage } from '../features/purchase-orders/PurchaseOrdersPage';
import { PurchaseOrderDetailPage } from '../features/purchase-orders/PurchaseOrderDetailPage';

// Receipt Components
import { UploadReceiptPage } from '../features/receipts/UploadReceiptPage';
import { ReceiptValidationPage } from '../features/receipts/ReceiptValidationPage';
import { ReceiptsListPage } from '../features/receipts/ReceiptsListPage';

// Dashboard Components
import StaffDashboard from '../features/staff/StaffDashboard';
import { ApproverDashboard } from '../features/approver/ApproverDashboard';
import { FinanceDashboardPage } from '../features/finance/FinanceDashboardPage';
import { ExportHistoryPage } from '../features/finance/ExportHistoryPage';

// Admin Components
import { AdminDashboard, UserManagement, UserForm } from '../features/admin';

const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Unauthorized</h1>
      <p className="text-gray-600">You do not have permission to access this page.</p>
    </div>
  </div>
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
        element: <ProfilePage />,
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
        element: <StaffDashboard />,
      },
      {
        path: 'requests',
        element: <RequestsListPage />,
      },
      {
        path: 'requests/create',
        element: <CreateRequestPage />,
      },
      {
        path: 'requests/:id/edit',
        element: <EditRequestPage />,
      },
      {
        path: 'requests/:id',
        element: <RequestDetailPage />,
      },
      {
        path: 'purchase-orders',
        element: <PurchaseOrdersPage />,
      },
      {
        path: 'purchase-orders/:poId',
        element: <PurchaseOrderDetailPage />,
      },
      {
        path: 'purchase-orders/:poId/upload-receipt',
        element: <UploadReceiptPage />,
      },
      {
        path: 'receipts/:receiptId/validate',
        element: <ReceiptValidationPage />,
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
        element: <ApproverDashboard />,
      },
      {
        path: 'requests/:id',
        element: <RequestDetailPage />,
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
        element: <FinanceDashboardPage />,
      },
      {
        path: 'requests',
        element: <RequestsListPage />,
      },
      {
        path: 'requests/:id',
        element: <RequestDetailPage />,
      },
      {
        path: 'purchase-orders',
        element: <PurchaseOrdersPage />,
      },
      {
        path: 'purchase-orders/:poId',
        element: <PurchaseOrderDetailPage />,
      },
      {
        path: 'purchase-orders/:poId/upload-receipt',
        element: <UploadReceiptPage />,
      },
      {
        path: 'receipts',
        element: <ReceiptsListPage />,
      },
      {
        path: 'receipts/:receiptId/validate',
        element: <ReceiptValidationPage />,
      },
      {
        path: 'export-history',
        element: <ExportHistoryPage />,
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
        element: <AdminDashboard />,
      },
      {
        path: 'users',
        element: <UserManagement />,
      },
      {
        path: 'users/new',
        element: <UserForm />,
      },
      {
        path: 'users/:userId',
        element: <UserForm />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
