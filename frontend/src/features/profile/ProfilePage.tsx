import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, Calendar } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      STAFF: { bg: 'bg-blue-100', text: 'text-blue-800' },
      APPROVER_L1: { bg: 'bg-purple-100', text: 'text-purple-800' },
      APPROVER_L2: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      FINANCE: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const badge = badges[role] || badges.STAFF;
    const displayRole = role.replace(/_/g, ' ');

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}
      >
        {displayRole}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information</p>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-3xl">
                {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {user.first_name} {user.last_name}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {user.email}
                </CardDescription>
                <div className="mt-2">{getRoleBadge(user.role)}</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">First Name</p>
                  <p className="text-base text-gray-900">{user.first_name}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Name</p>
                  <p className="text-base text-gray-900">{user.last_name}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Email Address</p>
                  <p className="text-base text-gray-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Role</p>
                  <p className="text-base text-gray-900">{user.role.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Member Since</p>
                  <p className="text-base text-gray-900">{formatDate(user.date_joined)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Your account verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Email Verification</p>
                <p className="text-base text-gray-900">
                  {user.is_verified ? (
                    <span className="text-green-600 font-medium">✓ Verified</span>
                  ) : (
                    <span className="text-yellow-600 font-medium">⚠ Not Verified</span>
                  )}
                </p>
              </div>
              {!user.is_verified && (
                <Button variant="outline" size="sm">
                  Verify Email
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Update Email
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
