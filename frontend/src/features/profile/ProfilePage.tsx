import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { authAPI } from '@/api/auth';
import { handleAndFormatError } from '@/utils/errorHandler';
import { Eye, EyeOff } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password2: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    const displayRole = role.replace(/_/g, ' ');
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await authAPI.updateProfile(profileData);
      await refreshUser();
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      setIsEditingProfile(false);
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
    });
    setIsEditingProfile(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSavePassword = async () => {
    if (passwordData.new_password !== passwordData.new_password2) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword(passwordData);
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      });
      setPasswordData({ old_password: '', new_password: '', new_password2: '' });
      setIsChangingPassword(false);
    } catch (error) {
      const { toastData } = handleAndFormatError(error);
      toast(toastData);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancelPassword = () => {
    setPasswordData({ old_password: '', new_password: '', new_password2: '' });
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsChangingPassword(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal information</p>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold text-3xl">
                {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">Personal Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </div>
              {!isEditingProfile && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingProfile ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      value={profileData.username}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={user.email} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-400">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={user.role.replace(/_/g, ' ')} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-400">Role is assigned by administrator</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <Input value={user.date_joined ? formatDate(user.date_joined) : 'N/A'} disabled className="bg-gray-50" />
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} disabled={savingProfile}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">First Name</p>
                  <p className="text-gray-900">{user.first_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Name</p>
                  <p className="text-gray-900">{user.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="text-gray-900">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-gray-900">{user.role.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-gray-900">{user.date_joined ? formatDate(user.date_joined) : 'N/A'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">Password</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </div>
              {!isChangingPassword && (
                <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                  Change Password
                </Button>
              )}
            </div>
          </CardHeader>
          {isChangingPassword && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="old_password"
                    name="old_password"
                    type={showOldPassword ? 'text' : 'password'}
                    value={passwordData.old_password}
                    onChange={handlePasswordChange}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showOldPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    name="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400">Must be at least 8 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password2">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="new_password2"
                    name="new_password2"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.new_password2}
                    onChange={handlePasswordChange}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleSavePassword}
                  disabled={savingPassword || !passwordData.old_password || !passwordData.new_password || !passwordData.new_password2}
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                <Button variant="outline" onClick={handleCancelPassword} disabled={savingPassword}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
