import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Layout from '../components/layout/Layout';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import HomePage from '../features/common/HomePage';
import ProfilePage from '../features/profile/ProfilePage';

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

// Dashboard Components
import StaffDashboard from '../features/staff/StaffDashboard';
import { ApproverDashboard } from '../features/approver/ApproverDashboard';

// Placeholder components for role-based dashboards

const FinanceDashboard: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Finance Dashboard</h1>
      <p className="text-gray-600">Coming soon - Analytics and receipt validation</p>
    </div>
  </div>
);

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
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'profile',
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
        element: <FinanceDashboard />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
