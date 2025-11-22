import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import HomePage from '../features/common/HomePage';

// Placeholder components for role-based dashboards
const StaffDashboard: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Staff Dashboard</h1>
      <p className="text-gray-600">Coming soon - Create and track purchase requests</p>
    </div>
  </div>
);

const ApproverDashboard: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Approver Dashboard</h1>
      <p className="text-gray-600">Coming soon - Review and approve purchase requests</p>
    </div>
  </div>
);

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
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
  {
    path: '/staff',
    element: <ProtectedRoute allowedRoles={['STAFF']} />,
    children: [
      {
        path: 'dashboard',
        element: <StaffDashboard />,
      },
    ],
  },
  {
    path: '/approver',
    element: <ProtectedRoute allowedRoles={['APPROVER_L1', 'APPROVER_L2']} />,
    children: [
      {
        path: 'dashboard',
        element: <ApproverDashboard />,
      },
    ],
  },
  {
    path: '/finance',
    element: <ProtectedRoute allowedRoles={['FINANCE']} />,
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
