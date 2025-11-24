import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  User,
  LogOut,
  ChevronDown,
  FileText,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Download,
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {displayRole}
      </span>
    );
  };

  const getDashboardPath = () => {
    if (!user) return '/';

    switch (user.role) {
      case 'STAFF':
        return '/staff/dashboard';
      case 'APPROVER_L1':
      case 'APPROVER_L2':
        return '/approver/dashboard';
      case 'FINANCE':
        return '/finance/dashboard';
      default:
        return '/';
    }
  };

  if (!user) return null;

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and nav */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  ProcureFlow
                </span>
              </div>

              {/* Navigation links */}
              <div className="hidden md:ml-6 md:flex md:space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate(getDashboardPath())}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>

                {user.role === 'STAFF' && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/staff/requests')}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      My Requests
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/staff/purchase-orders')}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Purchase Orders
                    </Button>
                  </>
                )}

                {user.role === 'FINANCE' && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/finance/requests')}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Requests
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/finance/purchase-orders')}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Purchase Orders
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/finance/receipts')}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Receipts
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/finance/export-history')}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export History
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right side - Notifications & User menu */}
            <div className="flex items-center space-x-2">
              {/* Notification Bell */}
              <NotificationBell />

              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  </div>
                </Button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-72 z-50">
                      <Card className="shadow-lg">
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                              {user.first_name?.charAt(0) || ''}{user.last_name?.charAt(0) || ''}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                {user.first_name} {user.last_name}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {user.email}
                              </CardDescription>
                              <div className="mt-1">
                                {getRoleBadge(user.role)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1 pt-0">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              navigate('/profile');
                              setShowUserMenu(false);
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Button>

                          <div className="border-t my-2"></div>

                          <Button
                            variant="ghost"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={handleLogout}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
