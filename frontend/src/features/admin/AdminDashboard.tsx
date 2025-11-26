import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { adminAPI } from '@/api/admin';
import type { AdminDashboardStats } from '@/types';
import { CheckCircle, Loader2, UserPlus, UserX } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  STAFF: 'bg-blue-50 text-blue-700',
  APPROVER_L1: 'bg-purple-50 text-purple-700',
  APPROVER_L2: 'bg-indigo-50 text-indigo-700',
  FINANCE: 'bg-emerald-50 text-emerald-700',
  ADMIN: 'bg-red-50 text-red-700',
};

const ROLE_LABELS: Record<string, string> = {
  STAFF: 'Staff',
  APPROVER_L1: 'Approver L1',
  APPROVER_L2: 'Approver L2',
  FINANCE: 'Finance',
  ADMIN: 'Administrator',
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDashboardStats();
      setStats(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage users and system settings</p>
          </div>
          <Button onClick={() => navigate('/admin/users/new')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Users */}
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total_users}</p>
              <p className="text-xs text-gray-400 mt-1">Registered in system</p>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="border-l-4 border-l-emerald-400">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.active_users}</p>
              <p className="text-xs text-gray-400 mt-1">Currently active accounts</p>
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Inactive Users</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.inactive_users}</p>
              <p className="text-xs text-gray-400 mt-1">Deactivated accounts</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Users by Role */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Users by Role</CardTitle>
              <CardDescription>Distribution of user roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats?.users_by_role ?? {}).map(([role, count]) => {
                  const percent = stats.total_users ? (count / stats.total_users) * 100 : 0;
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}>
                          {ROLE_LABELS[role] || role}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${percent}%`,
                            }}
                          ></div>
                        </div>
                        <span className="font-semibold text-sm w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => navigate('/admin/users')}
              >
                Manage All Users
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => navigate('/admin/users/new')}
              >
                Create New User
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => navigate('/admin/users?is_active=false')}
              >
                View Inactive Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      {stats && stats.recent_users.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">Recent Users</CardTitle>
                <CardDescription>Recently registered users</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_users.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {user.first_name?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}>
                      {user.role_display}
                    </Badge>
                    {user.is_active ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <UserX className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};
