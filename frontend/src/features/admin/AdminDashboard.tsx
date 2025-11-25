import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { adminAPI } from '@/api/admin';
import type { AdminDashboardStats, AdminUser } from '@/types';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  UserPlus,
  Settings,
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  STAFF: 'bg-blue-100 text-blue-800',
  APPROVER_L1: 'bg-purple-100 text-purple-800',
  APPROVER_L2: 'bg-indigo-100 text-indigo-800',
  FINANCE: 'bg-green-100 text-green-800',
  ADMIN: 'bg-red-100 text-red-800',
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage users and system settings</p>
        </div>
        <Button onClick={() => navigate('/admin/users/new')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
              <p className="text-xs text-gray-600 mt-1">Registered users</p>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_users}</div>
              <p className="text-xs text-gray-600 mt-1">Currently active</p>
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactive_users}</div>
              <p className="text-xs text-gray-600 mt-1">Deactivated accounts</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Users by Role */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <span>Users by Role</span>
              </CardTitle>
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
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
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
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="h-4 w-4 mr-3" />
                Manage All Users
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => navigate('/admin/users/new')}
              >
                <UserPlus className="h-4 w-4 mr-3" />
                Create New User
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => navigate('/admin/users?is_active=false')}
              >
                <UserX className="h-4 w-4 mr-3" />
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
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span>Recent Users</span>
                </CardTitle>
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
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">
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
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <UserX className="h-4 w-4 text-red-600" />
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
  );
};
