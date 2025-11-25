import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Menu,
  X,
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role: string) => {
    const displayRole = role.replace(/_/g, ' ');
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
        {displayRole}
      </span>
    );
  };

  const getDashboardPath = () => {
    if (!user) return '/';

    switch (user.role) {
      case 'ADMIN':
        return '/admin/dashboard';
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

  // Check if a nav link is active
  const isActive = (path: string) => location.pathname.startsWith(path);

  // Get navigation items based on role
  const getNavItems = () => {
    const items = [
      {
        path: getDashboardPath(),
        label: 'Dashboard',
        roles: ['STAFF', 'APPROVER_L1', 'APPROVER_L2', 'FINANCE', 'ADMIN'],
      },
    ];

    if (user?.role === 'STAFF') {
      items.push(
        { path: '/staff/requests', label: 'My Requests', roles: ['STAFF'] },
        { path: '/staff/purchase-orders', label: 'Purchase Orders', roles: ['STAFF'] }
      );
    }

    if (user?.role === 'FINANCE') {
      items.push(
        { path: '/finance/requests', label: 'Requests', roles: ['FINANCE'] },
        { path: '/finance/purchase-orders', label: 'Purchase Orders', roles: ['FINANCE'] },
        { path: '/finance/receipts', label: 'Receipts', roles: ['FINANCE'] },
        { path: '/finance/export-history', label: 'Export History', roles: ['FINANCE'] }
      );
    }

    if (user?.role === 'ADMIN') {
      items.push(
        { path: '/admin/users', label: 'User Management', roles: ['ADMIN'] }
      );
    }

    return items;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setShowMobileMenu(false);
  };

  if (!user) return null;

  const navItems = getNavItems();

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and nav */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden mr-2"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>

              <div className="flex-shrink-0 flex items-center">
                <FileText className="h-8 w-8 text-gray-900" />
                <span className="ml-2 text-xl font-semibold text-gray-900 hidden sm:block">
                  ProcureFlow
                </span>
              </div>

              {/* Desktop Navigation links */}
              <div className="hidden md:ml-6 md:flex md:space-x-1">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      onClick={() => navigate(item.path)}
                      className={`text-gray-700 hover:text-gray-900 ${
                        active ? 'bg-gray-100 text-gray-900' : ''
                      }`}
                    >
                      {item.label}
                    </Button>
                  );
                })}
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
                    <div className="h-9 w-9 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold">
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
                            <div className="h-12 w-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold text-lg">
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
                            className="w-full justify-start"
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

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      active
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}

              <div className="border-t border-gray-200 my-2"></div>

              <button
                onClick={() => {
                  navigate('/profile');
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                Profile
              </button>

              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
