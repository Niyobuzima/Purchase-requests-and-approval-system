import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserRole } from '@/types';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleDashboard = (): string => {
    if (!user) return '/';

    const roleRoutes: Record<UserRole, string> = {
      STAFF: '/staff/dashboard',
      APPROVER_L1: '/approver/dashboard',
      APPROVER_L2: '/approver/dashboard',
      FINANCE: '/finance/dashboard',
      ADMIN: '/admin/dashboard',
    };

    return roleRoutes[user.role] || '/';
  };

  const getRoleDisplayName = (): string => {
    if (!user) return '';

    const roleNames: Record<UserRole, string> = {
      STAFF: 'Staff',
      APPROVER_L1: 'Approver Level 1',
      APPROVER_L2: 'Approver Level 2',
      FINANCE: 'Finance',
      ADMIN: 'Administrator',
    };

    return roleNames[user.role] || user.role;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">P2P System</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome, {user?.first_name || user?.username}!
            </h2>
            <p className="mt-2 text-gray-600">
              You are logged in as {getRoleDisplayName()}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-base text-gray-900">
                    {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-base text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="text-base text-gray-900">{user?.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="text-base text-gray-900">{getRoleDisplayName()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Navigate to your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate(getRoleDashboard())}
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Info</CardTitle>
                <CardDescription>Application details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">System</p>
                  <p className="text-base text-gray-900">Procure-to-Pay (P2P)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Version</p>
                  <p className="text-base text-gray-900">1.0.0</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-base text-green-600">Active</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {user?.role === 'STAFF' && (
            <Card>
              <CardHeader>
                <CardTitle>Staff Features</CardTitle>
                <CardDescription>Available actions for staff members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  As a staff member, you can create purchase requests, track their status,
                  and view generated purchase orders.
                </p>
              </CardContent>
            </Card>
          )}

          {(user?.role === 'APPROVER_L1' || user?.role === 'APPROVER_L2') && (
            <Card>
              <CardHeader>
                <CardTitle>Approver Features</CardTitle>
                <CardDescription>Available actions for approvers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  As an approver, you can review pending purchase requests, approve or reject
                  them, and add comments to guide the process.
                </p>
              </CardContent>
            </Card>
          )}

          {user?.role === 'FINANCE' && (
            <Card>
              <CardHeader>
                <CardTitle>Finance Features</CardTitle>
                <CardDescription>Available actions for finance team</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  As a finance team member, you can access the finance dashboard, validate
                  receipts, review spending analytics, and export reports.
                </p>
              </CardContent>
            </Card>
          )}

          {user?.role === 'ADMIN' && (
            <Card>
              <CardHeader>
                <CardTitle>Administrator Features</CardTitle>
                <CardDescription>Available actions for administrators</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  As an administrator, you can manage all users in the system, change user roles,
                  activate or deactivate accounts, and view system-wide statistics.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
