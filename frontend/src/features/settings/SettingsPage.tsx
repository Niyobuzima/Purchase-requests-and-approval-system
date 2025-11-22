import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Moon, Globe, Shield } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your application preferences</p>
        </div>

        {/* Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-600" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive email updates about your requests</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Request Status Updates</p>
                <p className="text-sm text-gray-600">Get notified when request status changes</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Approval Reminders</p>
                <p className="text-sm text-gray-600">Reminders for pending approvals</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Moon className="h-5 w-5 text-gray-600" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Theme</p>
                <p className="text-sm text-gray-600">Choose your preferred theme</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Light
                </Button>
                <Button variant="ghost" size="sm">
                  Dark
                </Button>
                <Button variant="ghost" size="sm">
                  Auto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-gray-600" />
              <CardTitle>Language & Region</CardTitle>
            </div>
            <CardDescription>Set your language and regional preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Language</p>
                <p className="text-sm text-gray-600">Select your preferred language</p>
              </div>
              <Button variant="outline" size="sm">
                English (US)
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Date Format</p>
                <p className="text-sm text-gray-600">How dates are displayed</p>
              </div>
              <Button variant="outline" size="sm">
                MM/DD/YYYY
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Currency</p>
                <p className="text-sm text-gray-600">Default currency for amounts</p>
              </div>
              <Button variant="outline" size="sm">
                USD ($)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-gray-600" />
              <CardTitle>Privacy & Security</CardTitle>
            </div>
            <CardDescription>Manage your privacy and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Session Timeout</p>
                <p className="text-sm text-gray-600">Auto logout after inactivity</p>
              </div>
              <Button variant="outline" size="sm">
                30 minutes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
